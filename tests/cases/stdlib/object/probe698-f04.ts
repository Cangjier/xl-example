// xl:title (function () { const o = { ["a" + "b"]: 1 }; return o.ab; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { ["a" + "b"]: 1 }; return o.ab; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
