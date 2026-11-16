const prisma = require("../src/db");
const { exportQualityCsv } = require("../src/lib/qualityCsv");
exportQualityCsv(prisma)
  .then((r) => console.log(`Wrote ${r.rows} rows to ${r.outPath}`))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
