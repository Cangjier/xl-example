// xl:title (function () { const s = Symbol("k"); const o = { [s]: 1 }; return s in o; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const s = Symbol("k"); const o = { [s]: 1 }; return s in o; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
