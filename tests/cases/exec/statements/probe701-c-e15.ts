// xl:title (function () { try { throw new TypeError('t'); } catch (e) { return e.name + ':' + e.message; } })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw new TypeError('t'); } catch (e) { return e.name + ':' + e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
