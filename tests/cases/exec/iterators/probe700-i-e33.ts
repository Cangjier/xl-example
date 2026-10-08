// xl:title (function () { const m = new Map([['a', 1], ['b', 2]]); let t = 0; m.forEach(v => t += v); return t; })()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const m = new Map([['a', 1], ['b', 2]]); let t = 0; m.forEach(v => t += v); return t; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
