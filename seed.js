// Run from /backend:  node seed.js   (or: docker compose exec api node seed.js)
// Idempotent: vehicles are keyed on chassisNo (skipDuplicates); seeded service records (notes="seed") are replaced each run.
const { randomUUID } = require("crypto");
const prisma = require("./src/db");
const { generateDataset } = require("./src/seed/generator");
const { toRaw } = require("./src/seed/rawFormats");
const { normalise } = require("./src/adapters");
const { exportQualityCsv } = require("./src/lib/qualityCsv");
const MODELS = require("./src/data/models");

async function main() {
  const t0 = Date.now();
  const dataset = generateDataset();

  // showroom prices (idempotent upsert) - consumed by the fair price engine
  for (const [oem, list] of Object.entries(MODELS)) {
    for (const m of list) {
      await prisma.showroomPrice.upsert({
        where: { oem_model: { oem, model: m.name } },
        update: { priceInr: m.price },
        create: { oem, model: m.name, priceInr: m.price },
      });
    }
  }

  await prisma.vehicle.createMany({
    data: dataset.map((v) => ({ id: randomUUID(), oem: v.oem, model: v.model, year: v.year, chassisNo: v.chassisNo, registration: v.registration })),
    skipDuplicates: true,
  });
  const rows = await prisma.vehicle.findMany({ where: { chassisNo: { in: dataset.map((v) => v.chassisNo) } }, select: { id: true, chassisNo: true } });
  const idByChassis = new Map(rows.map((r) => [r.chassisNo, r.id]));

  await prisma.serviceRecord.deleteMany({ where: { notes: "seed", vehicleId: { in: rows.map((r) => r.id) } } });

  const records = [];
  for (const v of dataset) {
    for (const r of v.records) {
      const n = normalise(v.oem, toRaw[v.oem](v, r)); // raw OEM format -> adapter -> validated common schema
      records.push({
        vehicleId: idByChassis.get(n.chassisNo),
        serviceDate: new Date(n.serviceDate),
        odometerKm: n.odometerKm,
        serviceType: n.serviceType,
        confirmedBy: n.confirmed ? "OEM_DEALER" : "LOCAL_GARAGE",
        oemName: n.oem,
        dealerCode: n.dealerCode,
        notes: "seed",
      });
    }
  }
  for (let i = 0; i < records.length; i += 2000) {
    await prisma.serviceRecord.createMany({ data: records.slice(i, i + 2000) });
  }

  const csv = await exportQualityCsv(prisma);
  const anomalies = dataset.filter((v) => v.anomaly).length;
  console.log(`Seeded ${dataset.length} vehicles, ${records.length} service records, ${anomalies} anomaly vehicles in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`Data quality CSV: ${csv.outPath}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
