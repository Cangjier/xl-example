// xl:title (function () { let out = "no"; const p = Promise.resolve(1); p.then(() => { out = "yes"; }); return out; })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = "no"; const p = Promise.resolve(1); p.then(() => { out = "yes"; }); return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
