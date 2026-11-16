const mockPrisma = {
  vehicle: { findMany: jest.fn(), createMany: jest.fn(), findUnique: jest.fn() },
  serviceRecord: { findMany: jest.fn(), createMany: jest.fn(), create: jest.fn() },
};
jest.mock("../src/db", () => mockPrisma);
const express = require("express");
const request = require("supertest");
const { createIngestRouter } = require("../src/routes/ingest");

const app = express();
app.use(express.json());
app.use("/api/v1/ingest", createIngestRouter());

const heroRaw = { dealer_code: "HER-HYD-01", chassis_no: "MBLXX12345", service_date: "01-03-2024", odometer_km: 3200, service_type: "periodic", is_confirmed: 1 };
const VID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  Object.values(mockPrisma).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
  mockPrisma.vehicle.findMany.mockResolvedValue([{ id: VID, chassisNo: "MBLXX12345" }]);
  mockPrisma.serviceRecord.findMany.mockResolvedValue([]);
});

describe("POST /ingest/oem", () => {
  test("normalises and inserts a Hero record", async () => {
    const res = await request(app).post("/api/v1/ingest/oem").send({ oemName: "Hero", records: [heroRaw] });
    expect(res.status).toBe(201);
    expect(res.body.data.inserted).toBe(1);
    const row = mockPrisma.serviceRecord.createMany.mock.calls[0][0].data[0];
    expect(row).toMatchObject({ vehicleId: VID, odometerKm: 3200, confirmedBy: "OEM_DEALER", oemName: "Hero" });
  });
  test("skips duplicates already in the DB", async () => {
    mockPrisma.serviceRecord.findMany.mockResolvedValue([{ vehicleId: VID, serviceDate: new Date("2024-03-01T00:00:00.000Z"), odometerKm: 3200 }]);
    const res = await request(app).post("/api/v1/ingest/oem").send({ oemName: "Hero", records: [heroRaw] });
    expect(res.body.data).toMatchObject({ inserted: 0, skipped: 1 });
    expect(mockPrisma.serviceRecord.createMany).not.toHaveBeenCalled();
  });
  test("reports invalid records without failing the batch", async () => {
    const res = await request(app).post("/api/v1/ingest/oem").send({ oemName: "Hero", records: [heroRaw, { ...heroRaw, service_date: "bad" }] });
    expect(res.body.data.inserted).toBe(1);
    expect(res.body.data.errors).toHaveLength(1);
  });
  test("unknown OEM returns 400", async () => {
    const res = await request(app).post("/api/v1/ingest/oem").send({ oemName: "Yamaha", records: [heroRaw] });
    expect(res.status).toBe(400);
  });
  test("creates missing vehicles when provided", async () => {
    await request(app).post("/api/v1/ingest/oem").send({ oemName: "Hero", records: [heroRaw], vehicles: [{ chassisNo: "mblxx12345", model: "Splendor Plus", year: 2021, registration: "TS-09-AB-1234" }] });
    expect(mockPrisma.vehicle.createMany.mock.calls[0][0].data[0]).toMatchObject({ oem: "Hero", chassisNo: "MBLXX12345" });
  });
  test("rejects an empty records array", async () => {
    const res = await request(app).post("/api/v1/ingest/oem").send({ oemName: "Hero", records: [] });
    expect(res.status).toBe(400);
  });
});

describe("POST /ingest/owner", () => {
  const base = { vehicleId: VID, serviceDate: "2024-03-01", odometerKm: 4000, garageName: "Raju Garage" };
  test("stores an unconfirmed LOCAL_GARAGE entry", async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: VID, oem: "Hero", currentOwnerId: null });
    mockPrisma.serviceRecord.create.mockResolvedValue({ id: "r1", confirmedBy: "LOCAL_GARAGE" });
    const res = await request(app).post("/api/v1/ingest/owner").send(base);
    expect(res.status).toBe(201);
    expect(res.body.data.confirmed).toBe(false);
  });
  test("rejects future dates", async () => {
    const res = await request(app).post("/api/v1/ingest/owner").send({ ...base, serviceDate: "2999-01-01" });
    expect(res.status).toBe(400);
  });
  test("404 for unknown vehicle", async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue(null);
    const res = await request(app).post("/api/v1/ingest/owner").send(base);
    expect(res.status).toBe(404);
  });
  test("403 when another user owns the vehicle", async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({ id: VID, oem: "Hero", currentOwnerId: "someone-else" });
    const a = express();
    a.use(express.json());
    a.use("/api/v1/ingest", createIngestRouter({ requireAuth: (req, _res, next) => { req.user = { userId: "me" }; next(); } }));
    const res = await request(a).post("/api/v1/ingest/owner").send(base);
    expect(res.status).toBe(403);
  });
});
