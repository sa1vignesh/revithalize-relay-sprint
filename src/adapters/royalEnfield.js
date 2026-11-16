// Royal Enfield: nested objects. Odometer may be in miles (unit:"mi") -> converted to km.
// Raw: { outlet:{code}, vehicle:{chassis}, service:{date, odometer:{value, unit}, category}, confirmed }
const { parseYMD, normaliseType } = require("./util");
module.exports = {
  oem: "Royal Enfield",
  transform: (r) => {
    const odo = r.service.odometer;
    const km = String(odo.unit).toLowerCase() === "mi" ? odo.value * 1.609344 : odo.value;
    return {
      oem: "Royal Enfield",
      dealerCode: r.outlet.code,
      chassisNo: r.vehicle.chassis,
      serviceDate: parseYMD(r.service.date),
      odometerKm: Math.round(Number(km)),
      serviceType: normaliseType(r.service.category),
      confirmed: r.confirmed === true,
    };
  },
};
