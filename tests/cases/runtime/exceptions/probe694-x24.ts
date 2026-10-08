// xl:title (function () { try { [1].forEach(() => { throw new Error("in"); }); } catch (e) { return e.message; } })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { [1].forEach(() => { throw new Error("in"); }); } catch (e) { return e.message; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
