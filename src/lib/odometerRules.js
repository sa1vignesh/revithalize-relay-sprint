// INTERIM local copy of Althaf's 4 odometer rules (used by seed validation + CSV export).
// Swap for his module once merged. Records: [{ date: Date|string, odometerKm }] in any order.
const DAY = 86400000;
const MONTH_MS = 30.44 * DAY;

function checkOdometer(records) {
  const rs = [...records]
    .map((r) => ({ t: new Date(r.date).getTime(), km: r.odometerKm }))
    .sort((a, b) => a.t - b.t);
  const flags = [];
  for (let i = 1; i < rs.length; i++) {
    const prev = rs[i - 1], cur = rs[i];
    const diff = cur.km - prev.km;
    const gapMs = cur.t - prev.t;
    if (diff < 0) flags.push({ rule: 1, flag: "TAMPER_SUSPECTED", index: i, detail: `Reading fell by ${-diff} km` });
    else if (diff > 60000 && gapMs < 3 * MONTH_MS) flags.push({ rule: 2, flag: "SUSPICIOUS", index: i, detail: `+${diff} km in under 3 months` });
    else if (diff < 500) flags.push({ rule: 4, flag: "SUSPICIOUS", index: i, detail: `Only ${diff} km between entries` });
    if (gapMs > 15 * MONTH_MS) flags.push({ rule: 3, flag: "GAP", index: i, detail: `Gap of ${Math.round(gapMs / MONTH_MS)} months` });
  }
  let odometerStatus = "Consistent";
  if (flags.some((f) => f.flag === "TAMPER_SUSPECTED" || f.flag === "SUSPICIOUS")) odometerStatus = "Suspicious";
  else if (flags.length) odometerStatus = "Flagged";
  return { odometerStatus, flags };
}

module.exports = { checkOdometer, MONTH_MS };
