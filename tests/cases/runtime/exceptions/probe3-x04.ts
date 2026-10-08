// xl:title (function () { let out = ""; try { out += "t"; } finally { out += "f"; } return out; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let out = ""; try { out += "t"; } finally { out += "f"; } return out; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
