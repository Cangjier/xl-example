// xl:title Array.prototype.every.call({ length: 0 }, () => false)
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`（`every.call(类数组)`）。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.every.call({ length: 0 }, () => false)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
