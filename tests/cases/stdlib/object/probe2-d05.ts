// xl:title (function () { const d = Object.getOwnPropertyDescriptor({ a: 1 }, "a"); return [d.value, d.writable, d.enumerable, d.configurable].join(","); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const d = Object.getOwnPropertyDescriptor({ a: 1 }, "a"); return [d.value, d.writable, d.enumerable, d.configurable].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
