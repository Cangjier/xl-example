// xl:title (function () { const { a, ...rest } = { a: 1, b: 2 }; return JSON.stringify(rest); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const { a, ...rest } = { a: 1, b: 2 }; return JSON.stringify(rest); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
