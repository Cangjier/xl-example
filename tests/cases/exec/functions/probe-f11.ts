// xl:title (function (a) { return this === undefined || this === globalThis ? "loose" : "other"; }).call(null)
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a) { return this === undefined || this === globalThis ? "loose" : "other"; }).call(null)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
