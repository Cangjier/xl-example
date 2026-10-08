// xl:title typeof JSON.isRawJSON
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `JSON.isRawJSON`（与 `JSON.rawJSON`）没装——与 `stdlib/json/056-names-json` **同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof JSON.isRawJSON));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
