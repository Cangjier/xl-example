// xl:title typeof Math.random
// xl:round 703
// xl:judge stdout
// xl:want differ
// xl:why `Math.random` 没装（与 `stdlib/math/044-names-math` **同一条根**）：它要一个**宿主的随机源**，而判据是逐字节比 stdout ⇒ 只能量 `typeof`（这一条正是这样量的）。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(typeof Math.random));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
