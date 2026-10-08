// xl:title Array.prototype.filter.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (x) => x > 1).join(",")
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`：`filter` / `forEach` / `some` / `every` / `reduce` 那一族要按 `ToObject(this)` + `LengthOfArrayLike` 走。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.filter.call({ length: 3, 0: 1, 1: 2, 2: 3 }, (x) => x > 1).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
