jest.mock("../src/db", () => ({
  vehicle: { findMany: jest.fn().mockResolvedValue([{ id: "x", oem: "Hero", model: "Splendor Plus", year: 2020, registration: "TS-09-AB-1234" }]), findUnique: jest.fn() },
}));
const express = require("express");
const request = require("supertest");

function makeApp() {
  jest.resetModules();
  const app = express();
  app.use("/api/v1/vehicles", require("../src/routes/vehicles"));
  return app;
}

describe("GET /vehicles/search", () => {
  test("rejects a chassis that is not 5 alphanumerics", async () => {
    const res = await request(makeApp()).get("/api/v1/vehicles/search?chassis=ab");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
  test("returns masked registration only", async () => {
    const res = await request(makeApp()).get("/api/v1/vehicles/search?chassis=abc12");
    expect(res.status).toBe(200);
    expect(res.body.data[0].registrationMasked).toBe("TS-09-AB-12**");
    expect(res.body.data[0].registration).toBeUndefined();
  });
  test("4th request in the window is rate limited (429)", async () => {
    const app = makeApp();
    for (let i = 0; i < 3; i++) await request(app).get("/api/v1/vehicles/search?chassis=ABC12");
    const res = await request(app).get("/api/v1/vehicles/search?chassis=ABC12");
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
  });
});
