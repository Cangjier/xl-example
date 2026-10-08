// xl:title (function* () { yield 1; yield 2; })() && [...(function* () { yield 1; yield 2; })()].join()
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { yield 1; yield 2; })() && [...(function* () { yield 1; yield 2; })()].join()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
