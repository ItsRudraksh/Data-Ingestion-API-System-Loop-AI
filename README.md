# Data Ingestion API System

A simple API system to test skills in building APIs and incorporating basic logic. This system provides two RESTful APIs: one for submitting a data ingestion request and another for checking its status. The system fetches data from a simulated external API, processes it in batches asynchronously, and respects a rate limit.

## Project Structure

```
.
├── src/
│   ├── app.js             # Express app setup
│   ├── routes/
│   │   └── ingestRoutes.js  # Routes for /ingest and /status
│   ├── controllers/
│   │   └── ingestController.js # Logic for ingestion and status
│   ├── services/
│   │   └── ingestService.js   # Core logic for batching, queueing, processing
│   └── utils/
│       └── queue.js         # Priority queue implementation
├── tests/
│   └── api.test.js        # API tests
├── .gitignore
├── package.json
└── README.md
```

## Requirements

### 1. Ingestion API

- **Endpoint**: `POST /ingest`
- **Input**: A JSON payload containing a list of IDs (integers) and Priority.
  - `ids` → list of integers → id can be in the range of (1 to 10^9+7)
  - `priority` → Enum → (`HIGH`, `MEDIUM`, `LOW`)
  - Example: `{"ids": [1, 2, 3, 4, 5], "priority": "HIGH"}`
- **Behavior**:
  - Process ONLY 3 IDs at any point in time.
  - Enqueue each batch as a job to be processed asynchronously.
  - Simulate fetching data for each ID from an external API (mocked behavior with a simple delay and a static response like `{"id": <id>, "data": "processed"}`).
  - Respect a rate limit of 1 batch per 5 seconds (i.e., max 3 IDs per 5 seconds).
  - If a new request with higher priority arrives, its IDs should be processed before lower priority IDs.
  - Process data based on `(priority, created_time)`.
- **Output**: Return a unique `ingestion_id` immediately as a JSON response.
  - Example: `{"ingestion_id": "abc123"}`

### 2. Status API

- **Endpoint**: `GET /status/<ingestion_id>`
- **Input**: The `ingestion_id` returned by the ingestion API.
- **Behavior**: Retrieve the processing status of the ingestion request.
- **Output**: A JSON response showing the overall status and details of each batch.
  - Example:
    ```json
    {
      "ingestion_id": "abc123",
      "status": "triggered",
      "batches": [
        { "batch_id": "uuid1", "ids": [1, 2, 3], "status": "completed" },
        { "batch_id": "uuid2", "ids": [4, 5], "status": "triggered" }
      ]
    }
    ```
  - Possible batch statuses: `yet_to_start`, `triggered`, `completed`.
  - Possible overall statuses:
    - `yet_to_start`: If all batch statuses are `yet_to_start`.
    - `triggered`: If at least one batch status is `triggered`.
    - `completed`: If all batch statuses are `completed`.

## Setup and Run

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd data-ingestion-api
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the server**:
    ```bash
    npm start
    ```
    The server will start on `http://localhost:5000` (or the port specified in `src/app.js`).

## Running Tests

To run the automated tests, use the following command:

```bash
npm test
```

## Example API Usage

### Submit an Ingestion Request (POST /ingest)

```bash
curl -X POST http://localhost:5000/ingest -H "Content-Type: application/json" -d '{"ids": [10, 11, 12, 13, 14], "priority": "MEDIUM"}'
```

### Get Ingestion Status (GET /status/:ingestion_id)

Replace `<ingestion_id>` with the actual ID returned from a POST /ingest request.

```bash
curl http://localhost:5000/ingest/status/<ingestion_id>
```
