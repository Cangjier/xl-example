// xl:title (function () { const p = Promise.resolve(1); p.catch(() => {}); return p instanceof Promise; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const p = Promise.resolve(1); p.catch(() => {}); return p instanceof Promise; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
