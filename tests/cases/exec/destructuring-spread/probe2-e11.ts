// xl:title (function () { const f = (a, b, c) => a + b + c; const xs = [1, 2, 3]; return f(...xs); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = (a, b, c) => a + b + c; const xs = [1, 2, 3]; return f(...xs); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
