// xl:title (function () { try { null.x; } catch (e) { return e.constructor.name + ":" + (e instanceof TypeError); } })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { null.x; } catch (e) { return e.constructor.name + ":" + (e instanceof TypeError); } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
