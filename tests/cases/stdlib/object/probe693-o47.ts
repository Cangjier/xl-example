// xl:title (function () { const o = { a: 1 }; const p = Object.getOwnPropertyDescriptor(o, "a"); return [p.enumerable, p.configurable, p.writable].join(","); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; const p = Object.getOwnPropertyDescriptor(o, "a"); return [p.enumerable, p.configurable, p.writable].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
