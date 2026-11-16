// Bajaj: YYYY/MM/DD dates, odometer like "12,345 km", free-text visit type, status CLOSED = confirmed.
const { parseYMD, parseKm, normaliseType } = require("./util");
module.exports = {
  oem: "Bajaj",
  transform: (r) => ({
    oem: "Bajaj",
    dealerCode: r.DealerCode,
    chassisNo: r.FrameNo,
    serviceDate: parseYMD(r.VisitDate),
    odometerKm: parseKm(r.Kms),
    serviceType: normaliseType(r.VisitType),
    confirmed: String(r.Status).toUpperCase() === "CLOSED",
  }),
};
