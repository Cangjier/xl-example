// xl:title (function () { try { try { throw new Error("a"); } finally { } } catch (e) { return e.message; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { try { throw new Error("a"); } finally { } } catch (e) { return e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
