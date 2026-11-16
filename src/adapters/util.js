function iso(y, m, d) {
  const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid date");
  return dt.toISOString();
}
// "YYYY-MM-DD" or "YYYY/MM/DD"
function parseYMD(s) {
  const [y, m, d] = String(s).split(/[-/]/);
  return iso(y, m, d);
}
// "DD-MM-YYYY"
function parseDMY(s) {
  const [d, m, y] = String(s).split(/[-/]/);
  return iso(y, m, d);
}
function fromEpochMs(ms) {
  const dt = new Date(Number(ms));
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid date");
  return dt.toISOString();
}
// Parses 12345, "12,345", "12345 km"
function parseKm(v) {
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(n)) throw new Error("Invalid odometer value");
  return n;
}
function normaliseType(s) {
  const t = String(s || "").toLowerCase().trim();
  if (/recall|^rc$/.test(t)) return "Recall";
  if (/repair|breakdown|^rp$|paid/.test(t)) return "Repair";
  return "Periodic";
}
module.exports = { parseYMD, parseDMY, fromEpochMs, parseKm, normaliseType };
