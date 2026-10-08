// xl:title (function () { const t = {}; Object.defineProperty(t, "a", { value: 1, writable: false }); try { t.a = 5; return "no-throw:" + t.a; } catch (e) { return e.constructor.name; } })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const t = {}; Object.defineProperty(t, "a", { value: 1, writable: false }); try { t.a = 5; return "no-throw:" + t.a; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
