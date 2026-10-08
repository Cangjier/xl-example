// xl:title (function () { try { throw new Error("x"); } catch (e) { return e.message; } })()
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw new Error("x"); } catch (e) { return e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
