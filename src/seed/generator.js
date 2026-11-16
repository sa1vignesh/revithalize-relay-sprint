const MODELS = require("../data/models");

const REF_DATE = new Date(process.env.SEED_REF_DATE || "2026-11-01T00:00:00Z");
const DAY = 86400000;
const OEMS = Object.keys(MODELS);
const OEM_PREFIX = { Honda: "ME4", Hero: "MBL", TVS: "MD6", Bajaj: "MD2", "Royal Enfield": "ME3" };
const OEM_CODE = { Honda: "HND", Hero: "HER", TVS: "TVS", Bajaj: "BJJ", "Royal Enfield": "RE" };
const CITIES = ["HYD", "WGL", "KNR", "NZB", "KHM", "NLG", "ADB", "MBN"];
const DISTRICTS = ["01", "02", "07", "08", "09", "10", "11", "12", "13", "15", "16", "20", "23", "28", "30", "31"];
const ANOMALIES_PER_OEM = 15; // 5 OEMs x 15 = 75 exactly
const ANOMALY_KINDS = ["rollback", "gap", "jump"];
const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ";

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateDataset() {
  const rng = mulberry32(20261029);
  const rint = (a, b) => Math.floor(a + rng() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const alnum = LETTERS + "0123456789";
  const vehicles = [];
  let g = 0;

  for (const oem of OEMS) {
    let anomalies = 0;
    const dealers = CITIES.map((c, i) => `${OEM_CODE[oem]}-${c}-${String(i + 1).padStart(2, "0")}`);
    for (let i = 0; i < 100; i++, g++) {
      const model = MODELS[oem][i % 2].name;
      const year = 2018 + (i % 7);
      const kind = anomalies < ANOMALIES_PER_OEM && year <= 2022 ? ANOMALY_KINDS[anomalies++ % 3] : null;

      // unique last-5 chars per vehicle (multiplier is coprime with 36^5)
      const last5 = ((g * 48271 + 100003) % 60466176).toString(36).toUpperCase().padStart(5, "0");
      let mid = "A" + String(year).slice(2);
      while (mid.length < 9) mid += alnum[Math.floor(rng() * alnum.length)];
      const chassisNo = OEM_PREFIX[oem] + mid + last5;
      const registration = `TS-${pick(DISTRICTS)}-${pick(LETTERS)}${pick(LETTERS)}-${String(rint(1, 9999)).padStart(4, "0")}`;

      const home = pick(dealers);
      const kmPerMonth = 450 + rng() * 550;
      const purchase = Date.UTC(year, rint(0, 11), rint(1, 28));
      const unconfirmedVehicle = !kind && i % 7 === 3; // some vehicles carry LOCAL_GARAGE-style entries

      let t = purchase + rint(30, 60) * DAY;
      let km = Math.round(kmPerMonth * 1.2);
      let records = [];
      while (t <= REF_DATE.getTime()) {
        const r = rng();
        records.push({
          date: new Date(t),
          odometerKm: km,
          serviceType: r < 0.85 ? "Periodic" : r < 0.95 ? "Repair" : "Recall",
          dealerCode: rng() < 0.8 ? home : pick(dealers),
          confirmed: !(unconfirmedVehicle && records.length % 4 === 3),
        });
        // every 3,000-4,000 km or 4-6 months, whichever comes first
        const months = 4 + rng() * 2;
        const stepKm = Math.min(kmPerMonth * months, rint(3000, 4000));
        t += Math.max(1, Math.round((stepKm / kmPerMonth) * 30.44)) * DAY; // whole days
        km += Math.round(stepKm);
      }

      if (kind === "rollback") {
        const k = Math.floor(records.length / 2);
        records[k].odometerKm = Math.max(0, records[k - 1].odometerKm - rint(1500, 6000));
      } else if (kind === "gap") {
        const shift = 548 * DAY; // ~18 months
        records = records.slice(0, 2).concat(
          records.slice(2)
            .map((r) => ({ ...r, date: new Date(r.date.getTime() + shift), odometerKm: r.odometerKm + Math.round(kmPerMonth * 18) }))
            .filter((r) => r.date <= REF_DATE),
        );
      } else if (kind === "jump") {
        records[3].date = new Date(records[2].date.getTime() + 40 * DAY);
        for (let k = 3; k < records.length; k++) records[k].odometerKm += 65000;
      }

      vehicles.push({ oem, model, year, chassisNo, registration, anomaly: kind, records });
    }
  }
  return vehicles;
}

module.exports = { generateDataset, REF_DATE };
