// xl:title (function () { const src = { get a() { return 1; } }; const copy = { ...src }; return [copy.a, Object.getOwnPropertyDescriptor(copy, "a").get === undefined].join("|"); })()
// xl:round 698
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { const src = { get a() { return 1; } }; const copy = { ...src }; return [copy.a, Object.getOwnPropertyDescriptor(copy, "a").get === undefined].join("|"); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
