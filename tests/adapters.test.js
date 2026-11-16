const { normalise, UnsupportedOemError } = require("../src/adapters");
const { commonSchema } = require("../src/adapters/schema");

const samples = {
  Honda: { dealerCode: "HND-HYD-01", chassisNumber: "me4ja12345abcde12", serviceDate: "2024-03-01", odometerReading: 3200, jobType: "PERIODIC", verifiedByDealer: true },
  Hero: { dealer_code: "HER-WGL-02", chassis_no: "MBLXX12345", service_date: "01-03-2024", odometer_km: 3200, service_type: "periodic", is_confirmed: 1 },
  TVS: { DlrCd: "TVS-KNR-03", ChassisNumber: "MD6XX12345", SvcDt: Date.UTC(2024, 2, 1), OdoKm: "3,200", SvcCategory: "PS", Confirmed: "Y" },
  Bajaj: { DealerCode: "BJJ-NZB-04", FrameNo: "MD2XX12345", VisitDate: "2024/03/01", Kms: "3200 km", VisitType: "Periodic Service", Status: "CLOSED" },
  "Royal Enfield": { outlet: { code: "RE-KHM-05" }, vehicle: { chassis: "ME3XX12345" }, service: { date: "2024-03-01", odometer: { value: 3200, unit: "km" }, category: "Periodic" }, confirmed: true },
};

describe("OEM adapters", () => {
  test.each(Object.keys(samples))("%s output passes the common Zod schema", (oem) => {
    const out = normalise(oem, samples[oem]);
    expect(commonSchema.safeParse(out).success).toBe(true);
    expect(out).toMatchObject({ oem, odometerKm: 3200, serviceType: "Periodic", confirmed: true, serviceDate: "2024-03-01T00:00:00.000Z" });
  });

  test("chassis is upper-cased", () => expect(normalise("Honda", samples.Honda).chassisNo).toBe("ME4JA12345ABCDE12"));
  test("oem name lookup is case-insensitive", () => expect(normalise("royal enfield", samples["Royal Enfield"]).oem).toBe("Royal Enfield"));
  test("Royal Enfield miles are converted to km", () => {
    const raw = { ...samples["Royal Enfield"], service: { ...samples["Royal Enfield"].service, odometer: { value: 1000, unit: "mi" } } };
    expect(normalise("Royal Enfield", raw).odometerKm).toBe(1609);
  });
  test("unconfirmed flag is respected", () => expect(normalise("Hero", { ...samples.Hero, is_confirmed: 0 }).confirmed).toBe(false));
  test("TVS repair code maps to Repair", () => expect(normalise("TVS", { ...samples.TVS, SvcCategory: "RP" }).serviceType).toBe("Repair"));
  test("unknown OEM throws UnsupportedOemError", () => expect(() => normalise("Yamaha", {})).toThrow(UnsupportedOemError));
  test("bad date is rejected", () => expect(() => normalise("Hero", { ...samples.Hero, service_date: "xx-yy-zzzz" })).toThrow());
});
