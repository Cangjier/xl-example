// xl:title (function () { function f() { throw new RangeError("r"); } try { f(); } catch (e) { return e instanceof RangeError && e instanceof Error; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { throw new RangeError("r"); } try { f(); } catch (e) { return e instanceof RangeError && e instanceof Error; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
