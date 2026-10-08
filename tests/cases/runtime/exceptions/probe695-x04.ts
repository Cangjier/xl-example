// xl:title (function () { try { throw { a: 1 }; } catch (e) { return e.a; } })()
// xl:round 695
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw { a: 1 }; } catch (e) { return e.a; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
