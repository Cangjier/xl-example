// xl:title (function () { try { Array.prototype.map.call(null, (v) => v); } catch (e) { return e.constructor.name; } })()
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { Array.prototype.map.call(null, (v) => v); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
