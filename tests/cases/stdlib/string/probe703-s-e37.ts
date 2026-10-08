// xl:title typeof "abc".matchAll
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.matchAll` 没装——同上。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof "abc".matchAll));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
