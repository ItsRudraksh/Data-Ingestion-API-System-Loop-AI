const express = require("express");
const router = express.Router();
const ingestController = require("../controllers/ingestController");

// Route for submitting a data ingestion request
router.post("/", ingestController.handleIngestRequest);

// Route for checking the status of an ingestion request
router.get("/status/:ingestionId", ingestController.getIngestionStatus);

module.exports = router;
