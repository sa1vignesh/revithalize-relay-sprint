# RELAY Backend - Module 4: OEM Ingestion Layer & Synthetic Data

Revithalize Mobility - RELAY Sprint (Ref: RMPL/RELAY/SPRINT/NOV/2026/01)
Module owner: Sai Vignesh (SD/09)

RELAY is a verified vehicle-history product for used two-wheelers. This module is the data pipeline: an OEM-agnostic adapter layer, a synthetic data seed, and the ingestion and chassis-search APIs. When a real OEM API is connected later, only the adapter changes.

## What is in this module

| Part | Location |
|---|---|
| 5 OEM adapters (Honda, Hero, TVS, Bajaj, Royal Enfield) | `src/adapters/` |
| Common schema + Zod validation | `src/adapters/schema.js` |
| Seed script (500 vehicles, 75 anomalies) | `seed.js`, `src/seed/` |
| Ingestion API (`/ingest/oem`, `/ingest/owner`) | `src/routes/ingest.js` |
| Chassis search (rate limited) + service history | `src/routes/vehicles.js` |
| Data quality CSV export | `src/lib/qualityCsv.js`, `scripts/exportQualityCsv.js` |
| Showroom price table | `src/data/models.js`, `ShowroomPrice` table |
| Tests (Jest + Supertest) | `tests/` |
| Adapter documentation | `ADAPTERS.md` |
| Postman collection | `RELAY-Module4.postman_collection.json` |

## Tech stack

Node.js 20, Express, Prisma ORM, PostgreSQL 15, Zod, express-rate-limit, Jest + Supertest.

## Quick start

```bash
npm install
cp .env.example .env            # Windows: copy .env.example .env
npx prisma generate
npx prisma migrate dev --name init
node seed.js
npm test
npm run dev                     # local server on http://localhost:4000
```

PostgreSQL must be running. With Docker:
`docker run -d -p 5432:5432 -e POSTGRES_USER=relay -e POSTGRES_PASSWORD=relay_dev_pass -e POSTGRES_DB=relaydb postgres:15`

Inside the project Docker Compose stack: `docker compose exec api node seed.js`

## Demo interface

`npm run demo` serves a small web page at http://localhost:4000 (chassis check with service timeline, adapter playground, add garage visit). See `DEMO.md` for the walkthrough. The page lives in `public/index.html`; `src/server.dev.js` is only for local demos and is not part of the real gateway.

## Seed script

`node seed.js` (run from `/backend`):
- 500 vehicles, 100 per OEM, 2 models per OEM, years 2018-2024
- Registrations in Telangana format `TS-XX-XX-XXXX`
- Service every 3,000-4,000 km or 4-6 months, whichever comes first
- Exactly 75 vehicles with one injected anomaly: 25 odometer rollback, 25 long gap, 25 implausible jump
- Every record is created in the OEM's raw format and passed through the real adapter and Zod schema before insert
- Deterministic (fixed random seed) and idempotent (running it twice does not duplicate data)
- Fills the `ShowroomPrice` table and writes `exports/data_quality.csv`

## API

Base URL `/api/v1`. Responses: `{ "success": true/false, "data": {}, "error": "string" }`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/vehicles/search?chassis=XXXXX` | public | Match on last 5 chassis characters. Limit: 3 per IP per 10 min. Registration is masked. |
| GET | `/vehicles/:id/history` | required | Full service history sorted by date, with `gapMonthsFromPrevious`. |
| POST | `/ingest/oem` | required | `{ oemName, records: [raw], vehicles?: [{chassisNo, model, year, registration}] }`. Normalises via the adapter and inserts. Duplicates are skipped. |
| POST | `/ingest/owner` | required | Seller adds a local garage visit. Stored unconfirmed (`LOCAL_GARAGE`). |
| POST | `/ingest/preview` | required | Converts raw OEM records to the common format without saving (used by the demo playground). |

Auth is applied by the gateway (`createIngestRouter({ requireAuth })`). For local testing `src/server.dev.js` mounts everything without auth.

## Adding a new OEM

See `ADAPTERS.md`. About 30 minutes: add the OEM name to the schema, write a `transform()` adapter, register it, add a test.

## Notes for the team

- `prisma/schema.prisma` follows the sprint spec. If the Data Engine module (Althaf) has committed its own schema, use that one.
- `src/lib/odometerRules.js` and `src/lib/careScore.js` are temporary local copies of the Data Engine logic, used only for seed validation and the CSV. Replace them with the real module once merged.
- Showroom prices in `src/data/models.js` are approximate.
- Never commit `.env`, passwords or signing keys.
