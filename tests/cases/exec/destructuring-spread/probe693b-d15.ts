// xl:title (function () { const o = { a: 1 }; return { ...o, b: 2 }.b; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; return { ...o, b: 2 }.b; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
