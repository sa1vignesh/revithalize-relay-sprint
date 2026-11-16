// Minimal local server for testing Module 4 alone. The real gateway is Sai Teja app.js:
//   app.use("/api/v1/vehicles", require("./routes/vehicles"));
//   app.use("/api/v1/ingest", createIngestRouter({ requireAuth }));
const express = require("express");
const { createIngestRouter } = require("./routes/ingest");

const app = express();
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1/vehicles", require("./routes/vehicles"));
app.use("/api/v1/ingest", createIngestRouter());
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ success: false, data: null, error: "Internal server error" }); });
app.listen(process.env.PORT || 4000, () => console.log("dev server up"));
