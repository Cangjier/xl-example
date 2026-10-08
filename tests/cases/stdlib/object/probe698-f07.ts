// xl:title (function () { const o = { 1: "a", 0: "b", x: "c" }; return Object.keys(o).join(","); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { 1: "a", 0: "b", x: "c" }; return Object.keys(o).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
