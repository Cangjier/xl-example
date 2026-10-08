// xl:title (function () { try { throw { code: 1 }; } catch (e) { return e.code; } })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw { code: 1 }; } catch (e) { return e.code; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
