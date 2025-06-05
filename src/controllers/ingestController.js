const { v4: uuidv4 } = require('uuid');
const ingestService = require('../services/ingestService');

// In-memory store for ingestion requests (can be replaced with a database)
const ingestionStore = {}; // Stores { ingestion_id: { status, batches, priority, createdAt, original_ids } }

const handleIngestRequest = (req, res) => {
  const { ids, priority } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid input: ids array is required and cannot be empty.' });
  }
  if (!priority || !['HIGH', 'MEDIUM', 'LOW'].includes(priority.toUpperCase())) {
    return res.status(400).json({ error: 'Invalid input: priority is required and must be HIGH, MEDIUM, or LOW.' });
  }

  const ingestionId = uuidv4();
  const createdAt = new Date();

  // Store initial request details
  ingestionStore[ingestionId] = {
    status: 'yet_to_start', // Overall status
    batches: [],
    priority: priority.toUpperCase(),
    createdAt,
    original_ids: [...ids]
  };

  // Pass to service layer for processing
  ingestService.processIngestionRequest(ingestionId, ids, priority.toUpperCase(), createdAt, ingestionStore);

  res.status(202).json({ ingestion_id: ingestionId }); // 202 Accepted
};

const getIngestionStatus = (req, res) => {
  const { ingestionId } = req.params;
  const requestData = ingestionStore[ingestionId];

  if (!requestData) {
    return res.status(404).json({ error: 'Ingestion ID not found.' });
  }

  // Recalculate overall status based on batch statuses
  const overallStatus = ingestService.calculateOverallStatus(requestData.batches);

  res.status(200).json({
    ingestion_id: ingestionId,
    status: overallStatus,
    batches: requestData.batches.map(batch => ({
      batch_id: batch.batch_id,
      ids: batch.ids,
      status: batch.status
    }))
  });
};

module.exports = {
  handleIngestRequest,
  getIngestionStatus,
  ingestionStore // Exporting for service layer access, consider better state management for larger apps
};
