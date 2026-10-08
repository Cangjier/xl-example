// xl:title (function () { const x = () => { throw new Error('arrow'); }; try { x(); } catch (e) { return e.message; } })()
// xl:round 701
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const x = () => { throw new Error('arrow'); }; try { x(); } catch (e) { return e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
