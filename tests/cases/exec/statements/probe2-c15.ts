// xl:title (function () { let r = ""; try { try { throw 1; } finally { r += "f1"; } } catch (e) { r += "c"; } return r; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { let r = ""; try { try { throw 1; } finally { r += "f1"; } } catch (e) { r += "c"; } return r; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
