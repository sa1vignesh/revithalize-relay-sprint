// Local demo server for Module 4 (no auth). Serves the demo UI at http://localhost:4000
process.env.CHASSIS_SEARCH_LIMIT = process.env.CHASSIS_SEARCH_LIMIT || "100"; // run with CHASSIS_SEARCH_LIMIT=3 to show the real limit
const path = require("path");
const express = require("express");
const { ZodError } = require("zod");
const prisma = require("./db");
const { createIngestRouter } = require("./routes/ingest");
const { normalise, UnsupportedOemError } = require("./adapters");
const { checkOdometer } = require("./lib/odometerRules");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// demo helper: a few clean + flagged vehicles so you can click instead of typing
app.get("/api/v1/demo/samples", async (_req, res, next) => {
  try {
    const vs = await prisma.vehicle.findMany({ take: 200, include: { serviceRecords: true } });
    const rows = vs.map((v) => ({
      chassis5: v.chassisNo.slice(-5), oem: v.oem, model: v.model, year: v.year,
      status: checkOdometer(v.serviceRecords.map((r) => ({ date: r.serviceDate, odometerKm: r.odometerKm }))).odometerStatus,
    }));
    const pick = (f, n) => rows.filter(f).slice(0, n);
    res.json({ success: true, data: [...pick((r) => r.status === "Consistent", 3), ...pick((r) => r.status === "Suspicious", 2), ...pick((r) => r.status === "Flagged", 2)], error: null });
  } catch (e) { next(e); }
});

// adapter playground: convert raw OEM records, nothing is saved
app.post("/api/v1/ingest/preview", (req, res) => {
  const { oemName, records } = req.body || {};
  if (!oemName || !Array.isArray(records) || !records.length) return res.status(400).json({ success: false, data: null, error: "oemName and records are required" });
  try {
    const results = records.slice(0, 50).map((raw) => {
      try { return { ok: true, data: normalise(oemName, raw) }; }
      catch (e) {
        if (e instanceof UnsupportedOemError) throw e;
        return { ok: false, error: e instanceof ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e.message };
      }
    });
    res.json({ success: true, data: { results }, error: null });
  } catch (e) { res.status(400).json({ success: false, data: null, error: e.message }); }
});

app.use("/api/v1/vehicles", require("./routes/vehicles"));
app.use("/api/v1/ingest", createIngestRouter());
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ success: false, data: null, error: "Internal server error" }); });
app.listen(process.env.PORT || 4000, () => console.log(`RELAY Module 4 demo: http://localhost:${process.env.PORT || 4000}`));
