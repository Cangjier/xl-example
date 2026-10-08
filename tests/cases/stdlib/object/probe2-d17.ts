// xl:title (function () { const o = {}; o.a = 1; const d = Object.getOwnPropertyDescriptor(o, "a"); return d.value + "," + d.writable + "," + d.enumerable + "," + d.configurable; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = {}; o.a = 1; const d = Object.getOwnPropertyDescriptor(o, "a"); return d.value + "," + d.writable + "," + d.enumerable + "," + d.configurable; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
