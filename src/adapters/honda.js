// Honda: camelCase. Raw: { dealerCode, chassisNumber, serviceDate:"YYYY-MM-DD", odometerReading, jobType, verifiedByDealer }
const { parseYMD, parseKm, normaliseType } = require("./util");
module.exports = {
  oem: "Honda",
  transform: (r) => ({
    oem: "Honda",
    dealerCode: r.dealerCode,
    chassisNo: r.chassisNumber,
    serviceDate: parseYMD(r.serviceDate),
    odometerKm: parseKm(r.odometerReading),
    serviceType: normaliseType(r.jobType),
    confirmed: r.verifiedByDealer === true,
  }),
};
