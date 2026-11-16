// TVS: PascalCase abbreviations, epoch-ms dates, odometer as formatted string, type codes PS/RP/RC, Y/N flag.
const { fromEpochMs, parseKm, normaliseType } = require("./util");
module.exports = {
  oem: "TVS",
  transform: (r) => ({
    oem: "TVS",
    dealerCode: r.DlrCd,
    chassisNo: r.ChassisNumber,
    serviceDate: fromEpochMs(r.SvcDt),
    odometerKm: parseKm(r.OdoKm),
    serviceType: normaliseType(r.SvcCategory),
    confirmed: String(r.Confirmed).toUpperCase() === "Y",
  }),
};
