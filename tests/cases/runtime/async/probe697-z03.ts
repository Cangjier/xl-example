// xl:title (function () { const p = Promise.reject(1); p.catch(() => {}); return typeof p.then; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = Promise.reject(1); p.catch(() => {}); return typeof p.then; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
