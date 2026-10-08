// xl:title (function () { let s = ''; for (const k in { a: 1, b: 2 }) s += k; return s; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ''; for (const k in { a: 1, b: 2 }) s += k; return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
