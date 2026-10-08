// xl:title (function () { const o = { get a() { throw new Error("boom"); } }; try { return JSON.stringify(o); } catch (e) { return "threw:" + e.message; } })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { get a() { throw new Error("boom"); } }; try { return JSON.stringify(o); } catch (e) { return "threw:" + e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
