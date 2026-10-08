// xl:title typeof "abc".search
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `String.prototype.search` 没装——同上。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof "abc".search));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
