// xl:title (function () { const a = [1]; Object.freeze(a); try { a.push(2); return "no"; } catch (e) { return e.constructor.name; } })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const a = [1]; Object.freeze(a); try { a.push(2); return "no"; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
