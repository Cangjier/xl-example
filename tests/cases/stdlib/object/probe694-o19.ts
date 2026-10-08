// xl:title defineProperty 改数组下标那一格
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1, 2]; Object.defineProperty(a, 0, { value: 9 }); return a.join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
