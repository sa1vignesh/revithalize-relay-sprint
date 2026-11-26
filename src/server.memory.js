// Demo WITHOUT Postgres or Docker: same server and routes, data kept in memory (resets on restart).
const dbPath = require.resolve("./db");
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: require("./db.memory") };
require("./server.dev");
console.log("Running in memory mode: 500 seeded vehicles, no database needed. Data resets on restart.");
