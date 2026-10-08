// xl:title (function () { const o = { a: 1 }; return Object.keys(Object.assign({}, o)).join(","); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; return Object.keys(Object.assign({}, o)).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
