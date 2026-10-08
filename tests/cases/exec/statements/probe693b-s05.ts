// xl:title (function () { let s = ""; const o = { a: 1 }; for (const k in o) { o.b = 2; s += k; } return s; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let s = ""; const o = { a: 1 }; for (const k in o) { o.b = 2; s += k; } return s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
