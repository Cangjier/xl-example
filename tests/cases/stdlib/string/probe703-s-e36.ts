// xl:title typeof "abc".match
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.match` 没装（`typeof` 给 `undefined`，Node 给 `"function"`）——与 `stdlib/string/136` / `147` 同一条根。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof "abc".match));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
