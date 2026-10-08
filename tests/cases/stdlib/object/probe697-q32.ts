// xl:title (function () { try { Object.setPrototypeOf({}, 1); return "no"; } catch (e) { return e.constructor.name; } })()
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { Object.setPrototypeOf({}, 1); return "no"; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
