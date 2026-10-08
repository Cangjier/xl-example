// xl:title (function () { const err = new RangeError('r'); return err instanceof RangeError; })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const err = new RangeError('r'); return err instanceof RangeError; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
