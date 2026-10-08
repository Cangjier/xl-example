// xl:title (function () { const f = () => { throw 1; }; try { f(); } catch (e) { return e; } })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const f = () => { throw 1; }; try { f(); } catch (e) { return e; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
