// xl:title (function () { let out = ""; Promise.resolve(1).then((v) => { out += v; }).then(() => { out += "!"; }); return out; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; Promise.resolve(1).then((v) => { out += v; }).then(() => { out += "!"; }); return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
