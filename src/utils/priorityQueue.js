// Min-Heap implementation for a Priority Queue
// Lower priorityValue means higher priority in the queue

class PriorityQueue {
  constructor() {
    this.heap = [];
    this.priorityMap = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 }; // Lower number = higher priority
  }

  // Helper to get the priority value for comparison
  // Considers both priority string and creation time
  _getJobPriorityValue(job) {
    // We want older jobs of the same priority to go first.
    // A smaller timestamp means older.
    // To make older jobs have higher effective priority (smaller value in min-heap),
    // we can use the timestamp directly or a scaled version if needed.
    // For simplicity, let's combine: priority as major, timestamp as minor.
    // Example: HIGH at T=100 -> 1.000000000100 (approx)
    //          LOW  at T=50  -> 3.000000000050 (approx)
    // This ensures that priority is the main sorting key, and timestamp breaks ties.
    // JavaScript numbers have enough precision for typical timestamps.
    return this.priorityMap[job.priority] + (job.createdAt.getTime() / 1e14); // Scale timestamp to be fractional
  }

  enqueue(job) {
    this.heap.push(job);
    this._siftUp();
  }

  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    const job = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._siftDown();
    }
    return job;
  }

  peek() {
    return this.isEmpty() ? null : this.heap[0];
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  size() {
    return this.heap.length;
  }

  _siftUp() {
    let nodeIdx = this.heap.length - 1;
    while (nodeIdx > 0) {
      const parentIdx = Math.floor((nodeIdx - 1) / 2);
      if (this._getJobPriorityValue(this.heap[nodeIdx]) < this._getJobPriorityValue(this.heap[parentIdx])) {
        [this.heap[nodeIdx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[nodeIdx]];
        nodeIdx = parentIdx;
      } else {
        break;
      }
    }
  }

  _siftDown() {
    let nodeIdx = 0;
    while (true) {
      const leftChildIdx = 2 * nodeIdx + 1;
      const rightChildIdx = 2 * nodeIdx + 2;
      let smallestChildIdx = null;

      if (leftChildIdx < this.heap.length) {
        smallestChildIdx = leftChildIdx;
      }

      if (rightChildIdx < this.heap.length && 
          this._getJobPriorityValue(this.heap[rightChildIdx]) < this._getJobPriorityValue(this.heap[leftChildIdx])) {
        smallestChildIdx = rightChildIdx;
      }

      if (smallestChildIdx === null || 
          this._getJobPriorityValue(this.heap[nodeIdx]) <= this._getJobPriorityValue(this.heap[smallestChildIdx])) {
        break;
      }

      [this.heap[nodeIdx], this.heap[smallestChildIdx]] = [this.heap[smallestChildIdx], this.heap[nodeIdx]];
      nodeIdx = smallestChildIdx;
    }
  }
}

module.exports = PriorityQueue;
