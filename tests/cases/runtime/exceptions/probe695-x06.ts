// xl:title (function () { try { try { throw 1; } finally { return "f"; } } catch (e) { return "c"; } })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { try { throw 1; } finally { return "f"; } } catch (e) { return "c"; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
