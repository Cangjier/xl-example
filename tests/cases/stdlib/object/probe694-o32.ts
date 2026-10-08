// xl:title (function () { const o = { a: 1 }; Object.seal(o); try { delete o.a; return typeof o.a; } catch (e) { return e.constructor.name; } })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { a: 1 }; Object.seal(o); try { delete o.a; return typeof o.a; } catch (e) { return e.constructor.name; } })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
