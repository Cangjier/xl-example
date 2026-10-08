// xl:title (function () { const f = () => { throw new Error("arrow"); }; try { f(); } catch (e) { return e.message; } })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = () => { throw new Error("arrow"); }; try { f(); } catch (e) { return e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
