// xl:title (function () { try { throw 1; } catch (e) { var w = 2; } return w; })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw 1; } catch (e) { var w = 2; } return w; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
