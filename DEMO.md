# Demo guide (3-5 minutes)

## Start it
```bash
docker compose up -d postgres      # or any Postgres 15 on localhost:5432
npm install && npx prisma generate && npx prisma migrate dev --name init
node seed.js                       # 500 vehicles, 75 anomalies
npm run demo                       # open http://localhost:4000
```
To show the real rate limit (3 searches per 10 min), start with `CHASSIS_SEARCH_LIMIT=3 npm run demo`.

## What to show and say
1. **GitHub (30 s)** - open the repo: `src/adapters/` (5 OEM adapters), `seed.js`, `ADAPTERS.md`, `README.md`, `tests/`.
2. **Seed (30 s)** - run `node seed.js`; point at "500 vehicles ... 75 anomaly vehicles" and `exports/data_quality.csv`. Run it twice: still 500.
3. **Chassis check tab (90 s)** - tap a "Consistent" sample: clean timeline. Tap a "Suspicious" sample: red banner and the exact flag (rollback / jump). Tap another with a "Gap: N months" chip. Say: "gaps are shown, never hidden".
4. **Adapter playground tab (60 s)** - pick Hero, press Convert, then Honda, TVS, Bajaj, Royal Enfield: five different raw formats, same output. Break the JSON (bad date) to show Zod rejecting it.
5. **Add garage visit tab (30 s)** - save a visit, go back to the timeline: new entry with a hollow dot = unconfirmed.
6. **Close (15 s)** - "When a real OEM API arrives, only the adapter changes."

## Also run
`npx jest` - show the tests passing.
