const fs = require("fs");
const path = require("path");
const { checkOdometer } = require("./odometerRules");
const { careScore } = require("./careScore");

async function exportQualityCsv(prisma, outPath = path.join(__dirname, "../../exports/data_quality.csv")) {
  const vehicles = await prisma.vehicle.findMany({ include: { serviceRecords: true }, orderBy: { chassisNo: "asc" } });
  const lines = ["chassis,oem,model,year,careScore,odometerStatus,flagCount"];
  for (const v of vehicles) {
    const recs = v.serviceRecords.map((r) => ({ date: r.serviceDate, odometerKm: r.odometerKm, confirmed: r.confirmedBy === "OEM_DEALER" }));
    const { odometerStatus, flags } = checkOdometer(recs);
    const { score } = careScore({ year: v.year, records: recs, flags });
    lines.push([v.chassisNo, v.oem, `"${v.model}"`, v.year, score, odometerStatus, flags.length].join(","));
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n") + "\n");
  return { outPath, rows: vehicles.length };
}
module.exports = { exportQualityCsv };
