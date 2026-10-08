// xl:title (function () { const o = { a: 1 }; Object.preventExtensions(o); try { o.b = 2; return String(o.b); } catch (e) { return e.constructor.name; } })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.preventExtensions(o); try { o.b = 2; return String(o.b); } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
