// xl:title (function () { const o = { a: 1 }; const p = { ...o, b: 2 }; return JSON.stringify(p); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; const p = { ...o, b: 2 }; return JSON.stringify(p); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
