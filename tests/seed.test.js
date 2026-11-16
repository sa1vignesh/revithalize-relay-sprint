const { generateDataset, REF_DATE } = require("../src/seed/generator");
const { toRaw } = require("../src/seed/rawFormats");
const { normalise } = require("../src/adapters");
const { checkOdometer } = require("../src/lib/odometerRules");

const data = generateDataset();
const flagged = (v) => checkOdometer(v.records).flags.length > 0;

describe("seed dataset", () => {
  test("500 vehicles, 100 per OEM", () => {
    expect(data).toHaveLength(500);
    for (const oem of ["Honda", "Hero", "TVS", "Bajaj", "Royal Enfield"]) expect(data.filter((v) => v.oem === oem)).toHaveLength(100);
  });
  test("exactly 75 vehicles are flagged by the odometer rules, and they are the intended anomalies", () => {
    expect(data.filter(flagged)).toHaveLength(75);
    expect(data.filter((v) => v.anomaly && flagged(v))).toHaveLength(75);
  });
  test("all three anomaly kinds are caught by the right rule", () => {
    const rule = { rollback: 1, gap: 3, jump: 2 };
    for (const kind of Object.keys(rule)) {
      const vs = data.filter((v) => v.anomaly === kind);
      expect(vs.length).toBe(25);
      vs.forEach((v) => expect(checkOdometer(v.records).flags.some((f) => f.rule === rule[kind])).toBe(true));
    }
  });
  test("chassis last-5 are unique, registrations match TS-XX-XX-XXXX", () => {
    expect(new Set(data.map((v) => v.chassisNo.slice(-5))).size).toBe(500);
    data.forEach((v) => expect(v.registration).toMatch(/^TS-\d{2}-[A-Z]{2}-\d{4}$/));
  });
  test("no service after the reference date; years 2018-2024", () => {
    data.forEach((v) => { expect(v.year).toBeGreaterThanOrEqual(2018); expect(v.year).toBeLessThanOrEqual(2024); v.records.forEach((r) => expect(r.date <= REF_DATE).toBe(true)); });
  });
  test("deterministic: two runs give identical chassis numbers", () => {
    expect(generateDataset().map((v) => v.chassisNo)).toEqual(data.map((v) => v.chassisNo));
  });
  test("every raw record round-trips through its adapter", () => {
    data.forEach((v) => v.records.forEach((r) => {
      const n = normalise(v.oem, toRaw[v.oem](v, r));
      expect(n).toMatchObject({ serviceDate: r.date.toISOString(), chassisNo: v.chassisNo, odometerKm: r.odometerKm, serviceType: r.serviceType, confirmed: r.confirmed, dealerCode: r.dealerCode });
    }));
  });
});
