const express = require("express");
const { randomUUID } = require("crypto");
const { z, ZodError } = require("zod");
const prisma = require("../db");
const { normalise, getAdapter, UnsupportedOemError } = require("../adapters");
const { SERVICE_TYPES } = require("../adapters/schema");

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, error: null });
const fail = (res, status, error) => res.status(status).json({ success: false, data: null, error });
const key = (vehicleId, date, km) => `${vehicleId}|${new Date(date).toISOString()}|${km}`;

// requireAuth comes from Sai Teja gateway (mounted in app.js); the default is a pass-through for local dev.
function createIngestRouter({ requireAuth = (_req, _res, next) => next() } = {}) {
  const router = express.Router();
  router.use(requireAuth);

  // POST /api/v1/ingest/oem  { oemName, records: [rawOemRecord, ...] }
  router.post("/oem", async (req, res, next) => {
    try {
      const body = z.object({ oemName: z.string().min(1), records: z.array(z.record(z.any())).min(1).max(1000),
        // optional: vehicles to create first if their chassis is not in the DB yet
        vehicles: z.array(z.object({
          chassisNo: z.string().min(5).max(20), model: z.string().min(1), year: z.number().int().min(2000).max(2030), registration: z.string().min(4),
        })).max(1000).optional(),
      }).safeParse(req.body);
      if (!body.success) return fail(res, 400, body.error.issues[0].message);
      const { oemName, records, vehicles: newVehicles } = body.data;
      if (newVehicles && newVehicles.length) {
        const oem = getAdapter(oemName).oem;
        await prisma.vehicle.createMany({
          data: newVehicles.map((v) => ({ id: randomUUID(), oem, model: v.model, year: v.year, chassisNo: v.chassisNo.toUpperCase(), registration: v.registration })),
          skipDuplicates: true,
        });
      }

      const good = [], errors = [];
      records.forEach((raw, index) => {
        try { good.push(normalise(oemName, raw)); }
        catch (e) {
          if (e instanceof UnsupportedOemError) throw e;
          errors.push({ index, error: e instanceof ZodError ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") : e.message });
        }
      });

      const vehicles = await prisma.vehicle.findMany({
        where: { chassisNo: { in: [...new Set(good.map((g) => g.chassisNo))] } },
        select: { id: true, chassisNo: true },
      });
      const idByChassis = new Map(vehicles.map((v) => [v.chassisNo, v.id]));
      const existing = await prisma.serviceRecord.findMany({
        where: { vehicleId: { in: vehicles.map((v) => v.id) } },
        select: { vehicleId: true, serviceDate: true, odometerKm: true },
      });
      const seen = new Set(existing.map((e) => key(e.vehicleId, e.serviceDate, e.odometerKm)));

      const rows = [];
      let skipped = 0;
      for (const n of good) {
        const vehicleId = idByChassis.get(n.chassisNo);
        if (!vehicleId) { errors.push({ chassisNo: n.chassisNo, error: "Vehicle not found for chassis" }); continue; }
        const k = key(vehicleId, n.serviceDate, n.odometerKm);
        if (seen.has(k)) { skipped++; continue; }
        seen.add(k);
        rows.push({
          vehicleId, serviceDate: new Date(n.serviceDate), odometerKm: n.odometerKm, serviceType: n.serviceType,
          confirmedBy: n.confirmed ? "OEM_DEALER" : "LOCAL_GARAGE", oemName: n.oem, dealerCode: n.dealerCode,
        });
      }
      if (rows.length) await prisma.serviceRecord.createMany({ data: rows });
      return ok(res, { inserted: rows.length, skipped, errors }, rows.length ? 201 : 200);
    } catch (e) {
      if (e instanceof UnsupportedOemError) return fail(res, 400, e.message);
      next(e);
    }
  });

  // POST /api/v1/ingest/owner  - seller adds a local garage visit; always stored unconfirmed.
  router.post("/owner", async (req, res, next) => {
    try {
      const body = z.object({
        vehicleId: z.string().uuid(),
        serviceDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
        odometerKm: z.number().int().nonnegative().max(1000000),
        serviceType: z.enum(SERVICE_TYPES).default("Periodic"),
        garageName: z.string().max(100).optional(),
        notes: z.string().max(500).optional(),
      }).safeParse(req.body);
      if (!body.success) return fail(res, 400, body.error.issues[0].message);
      const b = body.data;

      const date = new Date(b.serviceDate);
      if (Number.isNaN(date.getTime()) || date > new Date()) return fail(res, 400, "serviceDate must be a valid date, not in the future");

      const vehicle = await prisma.vehicle.findUnique({ where: { id: b.vehicleId } });
      if (!vehicle) return fail(res, 404, "Vehicle not found");
      if (req.user && vehicle.currentOwnerId && vehicle.currentOwnerId !== req.user.userId) return fail(res, 403, "You do not own this vehicle");

      const rec = await prisma.serviceRecord.create({
        data: {
          vehicleId: vehicle.id, serviceDate: date, odometerKm: b.odometerKm, serviceType: b.serviceType,
          confirmedBy: "LOCAL_GARAGE", oemName: vehicle.oem, dealerCode: null,
          notes: [b.garageName, b.notes].filter(Boolean).join(" - ") || null,
        },
      });
      return ok(res, { id: rec.id, confirmed: false, confirmedBy: rec.confirmedBy }, 201);
    } catch (e) { next(e); }
  });

  return router;
}

module.exports = { createIngestRouter };
