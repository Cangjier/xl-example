// xl:title (function (a) { return this === undefined ? "u" : typeof this; }).call(1)
// xl:round 703
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function (a) { return this === undefined ? "u" : typeof this; }).call(1)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
