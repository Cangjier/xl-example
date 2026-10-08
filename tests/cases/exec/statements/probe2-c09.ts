// xl:title (function () { try { (function () { throw new TypeError("t"); })(); } catch (e) { return e.constructor === TypeError; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { (function () { throw new TypeError("t"); })(); } catch (e) { return e.constructor === TypeError; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
