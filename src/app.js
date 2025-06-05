const express = require("express");
const ingestRoutes = require("./routes/ingestRoutes");

const app = express();
const PORT = 5000;

app.use(express.json());

app.use("/ingest", ingestRoutes);

app.get("/", (req, res) => {
  res.send("Data Ingestion API is running!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
