// xl:title (function () { const t = {}; Object.assign(t, { get a() { return 5; } }); return t.a; })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const t = {}; Object.assign(t, { get a() { return 5; } }); return t.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
