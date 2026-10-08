// xl:title (function () { const it = { next: () => ({ value: 1, done: true }) }; return it.next().done; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const it = { next: () => ({ value: 1, done: true }) }; return it.next().done; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
