// xl:title (function () { function f() { try { throw new Error("x"); } catch (e) { return "c"; } finally { } } return f(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { function f() { try { throw new Error("x"); } catch (e) { return "c"; } finally { } } return f(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
