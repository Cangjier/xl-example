// xl:title Array.prototype.map.call({ length: 2, 0: 1, 1: 2 }, (x) => x * 2).join(",")
// xl:round 692
// xl:judge stdout
// xl:want differ
// xl:why `Array.prototype` 的方法在本仓是**数组专用**的窄口径（`RequireArray`），JS 的口径却是 `ToObject(this)` + `LengthOfArrayLike` 的**泛用**口径：`map.call({ length: 2, 0: 1, 1: 2 }, f)` 在 JS 里照类数组跑。同一批里 `slice` / `join` **是绿的**（那两格早就收了类数组）⇒ 这是一族**待做项**，不是口径差异。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.map.call({ length: 2, 0: 1, 1: 2 }, (x) => x * 2).join(",")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
