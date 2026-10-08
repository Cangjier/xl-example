// xl:title (function () { try { throw new Error("a"); } catch (e) { try { throw e; } catch (f) { return f.message; } } })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { try { throw new Error("a"); } catch (e) { try { throw e; } catch (f) { return f.message; } } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
