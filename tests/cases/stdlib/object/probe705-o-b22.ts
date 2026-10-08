// xl:title Reflect === undefined
// xl:round 705
// xl:judge stdout
// xl:want blocked
// xl:why `Reflect` 整个没有装（`name is not a local or a capture: Reflect`）——与第 703 轮登记的 `p703o-a25` 那一族**同一条根**。要做。
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Reflect === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
