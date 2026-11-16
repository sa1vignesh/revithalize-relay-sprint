const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const prisma = require("../db");
const { MONTH_MS } = require("../lib/odometerRules");

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data, error: null });
const fail = (res, status, error) => res.status(status).json({ success: false, data: null, error });

// 3 attempts / IP / 10 min (override with CHASSIS_SEARCH_LIMIT for tests). Sai Teja: this is the stricter chassis limit.
const chassisSearchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.CHASSIS_SEARCH_LIMIT || 3),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, error: "Too many chassis searches. Try again in 10 minutes." },
});

const maskReg = (reg) => reg.slice(0, -2) + "**"; // TS-09-AB-1234 -> TS-09-AB-12**

const router = express.Router();

// GET /api/v1/vehicles/search?chassis=XXXXX  (public)
router.get("/search", chassisSearchLimiter, async (req, res, next) => {
  try {
    const parsed = z.string().regex(/^[A-Za-z0-9]{5}$/, "chassis must be the last 5 alphanumeric characters")
      .transform((s) => s.toUpperCase()).safeParse(req.query.chassis);
    if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);

    const found = await prisma.vehicle.findMany({
      where: { chassisNo: { endsWith: parsed.data } },
      select: { id: true, oem: true, model: true, year: true, registration: true },
      take: 5,
    });
    return ok(res, found.map(({ registration, ...v }) => ({ ...v, registrationMasked: maskReg(registration) })));
  } catch (e) { next(e); }
});

// GET /api/v1/vehicles/:id/history  (auth enforced by the gateway)
router.get("/:id/history", async (req, res, next) => {
  try {
    if (!z.string().uuid().safeParse(req.params.id).success) return fail(res, 400, "Invalid vehicle id");
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: { serviceRecords: { orderBy: { serviceDate: "asc" } } },
    });
    if (!vehicle) return fail(res, 404, "Vehicle not found");

    const history = vehicle.serviceRecords.map((r, i, arr) => ({
      id: r.id,
      serviceDate: r.serviceDate.toISOString(),
      odometerKm: r.odometerKm,
      serviceType: r.serviceType,
      confirmedBy: r.confirmedBy,
      confirmed: r.confirmedBy === "OEM_DEALER",
      dealerCode: r.dealerCode,
      notes: r.notes,
      gapMonthsFromPrevious: i === 0 ? null : Math.round((r.serviceDate - arr[i - 1].serviceDate) / MONTH_MS),
    }));
    return ok(res, {
      vehicle: { id: vehicle.id, oem: vehicle.oem, model: vehicle.model, year: vehicle.year, registrationMasked: maskReg(vehicle.registration) },
      history,
    });
  } catch (e) { next(e); }
});

module.exports = router;
