// xl:title (function () { const o = { a: 1 }; const d = Object.getOwnPropertyDescriptor(o, "a"); return [d.writable, d.enumerable, d.configurable].join(","); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; const d = Object.getOwnPropertyDescriptor(o, "a"); return [d.writable, d.enumerable, d.configurable].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
