// xl:title (function () { const o = { get a() { return 1; } }; const d = Object.getOwnPropertyDescriptor(o, "a"); return [typeof d.get, d.set === undefined, d.enumerable].join(","); })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { get a() { return 1; } }; const d = Object.getOwnPropertyDescriptor(o, "a"); return [typeof d.get, d.set === undefined, d.enumerable].join(","); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
