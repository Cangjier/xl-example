// xl:title (function () { try { null.x; } catch (e) { return e instanceof TypeError; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { null.x; } catch (e) { return e instanceof TypeError; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
