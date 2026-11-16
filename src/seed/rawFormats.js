// Turns canonical seed records into each OEM raw format, so the seed exercises the real adapters.
const d10 = (d) => d.toISOString().slice(0, 10);

const toRaw = {
  Honda: (v, r) => ({ dealerCode: r.dealerCode, chassisNumber: v.chassisNo, serviceDate: d10(r.date), odometerReading: r.odometerKm, jobType: r.serviceType.toUpperCase(), verifiedByDealer: r.confirmed }),
  Hero: (v, r) => { const [y, m, d] = d10(r.date).split("-"); return { dealer_code: r.dealerCode, chassis_no: v.chassisNo, service_date: `${d}-${m}-${y}`, odometer_km: r.odometerKm, service_type: r.serviceType.toLowerCase(), is_confirmed: r.confirmed ? 1 : 0 }; },
  TVS: (v, r) => ({ DlrCd: r.dealerCode, ChassisNumber: v.chassisNo, SvcDt: r.date.getTime(), OdoKm: r.odometerKm.toLocaleString("en-US"), SvcCategory: { Periodic: "PS", Repair: "RP", Recall: "RC" }[r.serviceType], Confirmed: r.confirmed ? "Y" : "N" }),
  Bajaj: (v, r) => ({ DealerCode: r.dealerCode, FrameNo: v.chassisNo, VisitDate: d10(r.date).replace(/-/g, "/"), Kms: `${r.odometerKm} km`, VisitType: { Periodic: "Periodic Service", Repair: "Repair Job", Recall: "Recall Campaign" }[r.serviceType], Status: r.confirmed ? "CLOSED" : "OPEN" }),
  "Royal Enfield": (v, r) => ({ outlet: { code: r.dealerCode }, vehicle: { chassis: v.chassisNo }, service: { date: d10(r.date), odometer: { value: r.odometerKm, unit: "km" }, category: r.serviceType }, confirmed: r.confirmed }),
};
module.exports = { toRaw };
