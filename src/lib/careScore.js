// INTERIM local copy of Althaf care score formula (spec Module 3).
function careScore({ year, records, flags, now = new Date() }) {
  const ageYears = Math.max((now - new Date(Date.UTC(year, 0, 1))) / (365.25 * 86400000), 0.5);
  const expected = ageYears * 2;
  const weighted = records.reduce((s, r) => s + (r.confirmed ? 1 : 0.5), 0);
  let score = Math.min((weighted / expected) * 100, 100);
  for (const f of flags) {
    if (f.flag === "GAP") score -= 10;
    else if (f.flag === "TAMPER_SUSPECTED") score -= 15;
    else if (f.flag === "SUSPICIOUS") score -= 5;
  }
  score = Math.max(0, Math.round(score));
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Average" : "Poor";
  return { score, label };
}
module.exports = { careScore };
