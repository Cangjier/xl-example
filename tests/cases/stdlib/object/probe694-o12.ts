// xl:title (function () { const o = { 2: "b", 1: "a" }; return Object.keys(o).join(""); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { 2: "b", 1: "a" }; return Object.keys(o).join(""); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
