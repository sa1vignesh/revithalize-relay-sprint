// In-memory stand-in for Prisma (demo only). Same calls the routes use, backed by the seed generator. Resets on restart.
const { randomUUID } = require("crypto");
const { generateDataset } = require("./seed/generator");

const vehicles = [];
const records = [];
for (const v of generateDataset()) {
  const id = randomUUID();
  vehicles.push({ id, oem: v.oem, model: v.model, year: v.year, chassisNo: v.chassisNo, registration: v.registration, currentOwnerId: null });
  for (const r of v.records) {
    records.push({ id: randomUUID(), vehicleId: id, serviceDate: r.date, odometerKm: r.odometerKm, serviceType: r.serviceType, confirmedBy: r.confirmed ? "OEM_DEALER" : "LOCAL_GARAGE", oemName: v.oem, dealerCode: r.dealerCode, notes: "seed" });
  }
}

const byDate = (a, b) => a.serviceDate - b.serviceDate;
const withRecords = (v, include) => (include && include.serviceRecords ? { ...v, serviceRecords: records.filter((r) => r.vehicleId === v.id).sort(byDate) } : { ...v });

module.exports = {
  vehicle: {
    async findMany({ where = {}, take, include } = {}) {
      let out = vehicles;
      const c = where.chassisNo;
      if (c && c.endsWith) out = out.filter((v) => v.chassisNo.endsWith(c.endsWith));
      if (c && c.in) out = out.filter((v) => c.in.includes(v.chassisNo));
      if (take) out = out.slice(0, take);
      return out.map((v) => withRecords(v, include));
    },
    async findUnique({ where, include }) {
      const v = vehicles.find((x) => x.id === where.id);
      return v ? withRecords(v, include) : null;
    },
    async createMany({ data, skipDuplicates }) {
      let n = 0;
      for (const d of data) {
        if (skipDuplicates && vehicles.some((v) => v.chassisNo === d.chassisNo)) continue;
        vehicles.push({ currentOwnerId: null, ...d }); n++;
      }
      return { count: n };
    },
  },
  serviceRecord: {
    async findMany({ where = {} } = {}) {
      const ids = where.vehicleId && where.vehicleId.in;
      return records.filter((r) => !ids || ids.includes(r.vehicleId));
    },
    async createMany({ data }) {
      data.forEach((d) => records.push({ id: randomUUID(), dealerCode: null, notes: null, ...d }));
      return { count: data.length };
    },
    async create({ data }) {
      const r = { id: randomUUID(), dealerCode: null, notes: null, ...data };
      records.push(r);
      return r;
    },
  },
};
