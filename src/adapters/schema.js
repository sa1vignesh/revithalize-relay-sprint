const { z } = require("zod");

const OEMS = ["Honda", "Hero", "TVS", "Bajaj", "Royal Enfield"];
const SERVICE_TYPES = ["Periodic", "Repair", "Recall"];

// The ONE shape every adapter must produce.
const commonSchema = z.object({
  oem: z.enum(OEMS),
  dealerCode: z.string().min(1),
  chassisNo: z.string().min(5).max(20).transform((s) => s.toUpperCase()),
  serviceDate: z.string().datetime(), // ISO 8601, e.g. 2026-10-29T00:00:00.000Z
  odometerKm: z.number().int().nonnegative(),
  serviceType: z.enum(SERVICE_TYPES),
  confirmed: z.boolean(),
});

module.exports = { commonSchema, OEMS, SERVICE_TYPES };
