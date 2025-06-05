const { v4: uuidv4 } = require("uuid");
const PriorityQueue = require("../utils/priorityQueue");
const jobQueue = new PriorityQueue();

const RATE_LIMIT_MS = 5000; // 1 batch per 5 seconds
const BATCH_SIZE = 3;
let processingTimeoutId = null; // Used for scheduling the next queue run due to rate limit
let lastProcessingStartTime = 0; // Timestamp of when the last batch started being processed

/**
 * Calculates the overall status of an ingestion request based on its batches.
 * @param {Array} batches - Array of batch objects.
 * @returns {String} Overall status ('yet_to_start', 'triggered', 'completed').
 */
const calculateOverallStatus = (batches) => {
  if (!batches || batches.length === 0) {
    return "yet_to_start"; // Or handle as an error/unknown state
  }

  const allYetToStart = batches.every(
    (batch) => batch.status === "yet_to_start"
  );
  if (allYetToStart) {
    return "yet_to_start";
  }

  const allCompleted = batches.every((batch) => batch.status === "completed");
  if (allCompleted) {
    return "completed";
  }

  // If not all are 'yet_to_start' and not all are 'completed',
  // then at least one must be 'triggered' or in progress.
  return "triggered";
};

/**
 * Simulates fetching data for a single ID.
 * @param {Number} id - The ID to process.
 * @returns {Promise<Object>} - A promise that resolves with the processed data.
 */
const simulateApiCall = (id) => {
  return new Promise((resolve) => {
    // Simulate network delay (e.g., 100ms to 500ms)
    const delay = Math.random() * 400 + 100;
    setTimeout(() => {
      resolve({ id: id, data: "processed" });
    }, delay);
  });
};

/**
 * Processes a single batch of IDs.
 * @param {Object} batch - The batch object to process.
 * @param {Object} ingestionStore - The main store for ingestion data.
 * @param {String} ingestionId - The ID of the parent ingestion request.
 */
const processSingleBatch = async (batch, ingestionStore, ingestionId) => {
  console.log(
    `[${new Date().toISOString()}] Processing batch ${
      batch.batch_id
    } for ingestion ${ingestionId} with IDs: ${batch.ids.join(
      ", "
    )}, Priority: ${ingestionStore[ingestionId]?.priority}`
  );
  // No longer setting batch.status = "triggered" here, it's done in processQueue.

  try {
    // Simulate processing each ID in the batch
    for (const id of batch.ids) {
      await simulateApiCall(id);
      console.log(
        `[${new Date().toISOString()}] Finished processing ID ${id} for batch ${
          batch.batch_id
        }`
      );
    }
    batch.status = "completed";
    console.log(
      `[${new Date().toISOString()}] Completed batch ${
        batch.batch_id
      } for ingestion ${ingestionId}`
    );
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error processing batch ${batch.batch_id}:`,
      error
    );
    batch.status = "failed"; // Optional: add a 'failed' status
  }
};

// Main queue processing logic
const processQueue = (ingestionStore) => {
  if (jobQueue.isEmpty()) {
    return;
  }

  const now = Date.now();
  const timeSinceLastProcessing = now - lastProcessingStartTime;

  if (timeSinceLastProcessing < RATE_LIMIT_MS) {
    // Not enough time has passed, schedule a retry
    const remainingTime = RATE_LIMIT_MS - timeSinceLastProcessing;
    // console.log(`[Queue] Waiting ${remainingTime}ms for rate limit...`); // For debugging

    // Clear any existing timeout to avoid multiple timers for the same purpose
    if (processingTimeoutId) {
      clearTimeout(processingTimeoutId);
    }
    processingTimeoutId = setTimeout(() => {
      // Once the rate limit cooldown is over, try processing again
      processQueue(ingestionStore);
    }, remainingTime);
    return;
  }

  // Rate limit is satisfied, attempt to process a batch
  const job = jobQueue.dequeue();

  if (!job) {
    // This can happen if the queue was empty right after the time check, or if a job was somehow invalid.
    // In this case, we should reset lastProcessingStartTime to allow new jobs to start immediately if they come in.
    lastProcessingStartTime = 0; // Reset so next job can start immediately if no more jobs in queue
    return;
  }

  const ingestionData = ingestionStore[job.ingestionId];
  const batchToProcess = ingestionData?.batches?.find(
    (b) => b.batch_id === job.batchId
  );

  if (batchToProcess && batchToProcess.status === "yet_to_start") {
    batchToProcess.status = "triggered"; // Mark as triggered immediately
    lastProcessingStartTime = now; // Mark the start of this batch's processing for rate limiting

    // Process the batch asynchronously without blocking the queue processing logic
    processSingleBatch(batchToProcess, ingestionStore, job.ingestionId)
      .then(() => {
        // After processing, attempt to process the next item in the queue
        // It will respect rate limit if needed
        processQueue(ingestionStore);
      })
      .catch((error) => {
        console.error("Error processing batch asynchronously:", error);
        // Even if error, attempt to process the next job
        processQueue(ingestionStore);
      });
  } else {
    // If batch already processed or not found, try next job in queue immediately.
    // This handles cases where job might be stale in queue or already processed.
    processQueue(ingestionStore);
  }
};

/**
 * Splits IDs into batches and adds them to the processing queue.
 * @param {String} ingestionId - The unique ID for this ingestion request.
 * @param {Array<Number>} ids - List of IDs to process.
 * @param {String} priority - Priority of the request (HIGH, MEDIUM, LOW).
 * @param {Date} createdAt - Timestamp of when the request was created.
 * @param {Object} ingestionStore - The main store for ingestion data.
 */
const processIngestionRequest = (
  ingestionId,
  ids,
  priority,
  createdAt,
  ingestionStore
) => {
  const batches = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    const batch = {
      batch_id: uuidv4(),
      ids: batchIds,
      status: "yet_to_start",
    };
    batches.push(batch);
    // Add job to our priority queue
    jobQueue.enqueue({
      ingestionId,
      batchId: batch.batch_id,
      priority, // 'HIGH', 'MEDIUM', 'LOW'
      createdAt, // Date object
    });
  }

  ingestionStore[ingestionId].batches = batches;
  ingestionStore[ingestionId].status = calculateOverallStatus(batches); // Initial overall status
  ingestionStore[ingestionId].priority = priority; // Store priority for logging

  // Start processing the queue if not already active
  processQueue(ingestionStore);
};

// Function to reset state for testing purposes
const resetServiceStateForTesting = () => {
  // isProcessing is removed
  if (processingTimeoutId) {
    clearTimeout(processingTimeoutId);
    processingTimeoutId = null;
  }
  while (!jobQueue.isEmpty()) {
    jobQueue.dequeue();
  }
  lastProcessingStartTime = 0; // Reset for testing
  console.log(
    "[TestUtil] Ingest service state (isProcessing, timeout, queue) reset."
  );
};

module.exports = {
  processIngestionRequest,
  calculateOverallStatus,
  processQueue,
  jobQueue,
  resetServiceStateForTesting,
};
