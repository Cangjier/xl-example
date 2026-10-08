// xl:title (function () { const o = { a: 1, b: 2 }; const { a, ...rest } = o; return Object.keys(rest).join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1, b: 2 }; const { a, ...rest } = o; return Object.keys(rest).join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
