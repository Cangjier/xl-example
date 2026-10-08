// xl:title (function () { const o = { get a() { return 1; } }; Object.defineProperty(o, "a", { value: 2 }); return o.a; })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const o = { get a() { return 1; } }; Object.defineProperty(o, "a", { value: 2 }); return o.a; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
