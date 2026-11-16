# OEM Adapters (Module 4)

Every OEM sends service data in its own format. An **adapter** converts one raw record into the single common schema, so nothing else in RELAY ever sees an OEM-specific field.

```
raw OEM JSON --> adapter.transform() --> Zod commonSchema --> DB
```

## Common output schema (`src/adapters/schema.js`)

| Field | Type | Notes |
|---|---|---|
| oem | `Honda \| Hero \| TVS \| Bajaj \| Royal Enfield` | |
| dealerCode | string | non-empty |
| chassisNo | string (5-20) | upper-cased by the schema |
| serviceDate | ISO 8601 string | `2024-03-01T00:00:00.000Z` |
| odometerKm | integer >= 0 | always km |
| serviceType | `Periodic \| Repair \| Recall` | |
| confirmed | boolean | `true` -> stored as `OEM_DEALER`, `false` -> `LOCAL_GARAGE` |

## Adapter interface

```js
module.exports = {
  oem: "Honda",
  transform: (raw) => ({ oem, dealerCode, chassisNo, serviceDate, odometerKm, serviceType, confirmed }),
};
```

`transform` only maps fields. Validation happens in one place: `normalise(oemName, raw)` in `src/adapters/index.js` calls `transform` then `commonSchema.parse`. Helpers in `util.js` cover date formats (`parseYMD`, `parseDMY`, `fromEpochMs`), odometer strings (`parseKm`) and service-type text (`normaliseType`).

## Raw formats handled

| OEM | Style | Example |
|---|---|---|
| Honda | camelCase | `{ dealerCode, chassisNumber, serviceDate:"2024-03-01", odometerReading:3200, jobType:"PERIODIC", verifiedByDealer:true }` |
| Hero | snake_case, DD-MM-YYYY | `{ dealer_code, chassis_no, service_date:"01-03-2024", odometer_km:3200, service_type:"periodic", is_confirmed:1 }` |
| TVS | PascalCase, epoch ms, `"3,200"`, codes PS/RP/RC | `{ DlrCd, ChassisNumber, SvcDt:1709251200000, OdoKm:"3,200", SvcCategory:"PS", Confirmed:"Y" }` |
| Bajaj | `YYYY/MM/DD`, `"3200 km"`, status CLOSED | `{ DealerCode, FrameNo, VisitDate:"2024/03/01", Kms:"3200 km", VisitType:"Periodic Service", Status:"CLOSED" }` |
| Royal Enfield | nested, km or miles | `{ outlet:{code}, vehicle:{chassis}, service:{date, odometer:{value,unit}, category}, confirmed }` |

## Add a new OEM in under 30 minutes

1. Add the OEM name to `OEMS` in `src/adapters/schema.js` (2 min).
2. Copy `hero.js` to `src/adapters/yamaha.js`; change `oem` and map each raw field (10 min).
3. Register it in the `adapters` map in `src/adapters/index.js`, key is the lower-case name (1 min).
4. Add a sample raw record to `tests/adapters.test.js` and run `npx jest adapters` (5 min).
5. Add models to `src/data/models.js` and a `toRaw` entry in `src/seed/rawFormats.js` if you want it seeded (10 min).

## Ingestion API

- `POST /api/v1/ingest/oem` body `{ "oemName": "Hero", "records": [ ...raw ], "vehicles": [ { chassisNo, model, year, registration } ] }` (`vehicles` is optional: those vehicles are created first if missing) -> `{ inserted, skipped, errors[] }`. Duplicates (same vehicle + date + odometer) are skipped. Records for unknown chassis numbers are reported in `errors`.
- `POST /api/v1/ingest/owner` body `{ vehicleId, serviceDate, odometerKm, serviceType?, garageName?, notes? }`. Stored as `confirmedBy: LOCAL_GARAGE` (unconfirmed). Future dates are rejected.
- `GET /api/v1/vehicles/search?chassis=ABC12` public; matches the last 5 characters; 3 requests per IP per 10 minutes; registration is masked.
- `GET /api/v1/vehicles/:id/history` sorted by date, includes `gapMonthsFromPrevious` per entry.

## Seed script

`node seed.js` from `/backend` (or `docker compose exec api node seed.js`). 500 vehicles (100 per OEM), 75 with exactly one injected anomaly (25 rollback, 25 long gap, 25 implausible jump), deterministic (fixed random seed, so the same chassis numbers every run), idempotent, and writes `exports/data_quality.csv`. Set `SEED_REF_DATE` to change the "today" the history runs up to.

## Showroom prices

`node seed.js` also upserts a `ShowroomPrice` table (oem, model, priceInr) for all 10 models, from `src/data/models.js`. Prices are approximate. Sai Charan can read this table or the same file.
