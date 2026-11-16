// Hero: snake_case, DD-MM-YYYY dates. Raw: { dealer_code, chassis_no, service_date, odometer_km, service_type, is_confirmed:1|0 }
const { parseDMY, parseKm, normaliseType } = require("./util");
module.exports = {
  oem: "Hero",
  transform: (r) => ({
    oem: "Hero",
    dealerCode: r.dealer_code,
    chassisNo: r.chassis_no,
    serviceDate: parseDMY(r.service_date),
    odometerKm: parseKm(r.odometer_km),
    serviceType: normaliseType(r.service_type),
    confirmed: Number(r.is_confirmed) === 1,
  }),
};
