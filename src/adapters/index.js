const { commonSchema } = require("./schema");

// To add an OEM: create <oem>.js exporting { oem, transform }, add it to this map + OEMS in schema.js.
const adapters = {
  honda: require("./honda"),
  hero: require("./hero"),
  tvs: require("./tvs"),
  bajaj: require("./bajaj"),
  "royal enfield": require("./royalEnfield"),
};

class UnsupportedOemError extends Error {}

function getAdapter(oemName) {
  const a = adapters[String(oemName || "").trim().toLowerCase()];
  if (!a) throw new UnsupportedOemError(`Unsupported OEM: ${oemName}`);
  return a;
}

// raw OEM payload -> validated common schema (throws ZodError / Error on bad input)
function normalise(oemName, raw) {
  return commonSchema.parse(getAdapter(oemName).transform(raw));
}

module.exports = { normalise, getAdapter, UnsupportedOemError, adapters };
