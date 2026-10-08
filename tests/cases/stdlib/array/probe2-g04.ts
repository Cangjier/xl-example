// xl:title Array.prototype.indexOf.call({ length: 2, 0: "a", 1: "b" }, "b")
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why 同 `g02`：`indexOf` / `lastIndexOf` / `includes` 那一族也要按 `LengthOfArrayLike` 读类数组。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.indexOf.call({ length: 2, 0: "a", 1: "b" }, "b")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
