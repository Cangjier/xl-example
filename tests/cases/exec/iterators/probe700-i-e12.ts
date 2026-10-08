// xl:title (function* () { yield 1; })()[Symbol.iterator]() === undefined
// xl:round 700
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function* () { yield 1; })()[Symbol.iterator]() === undefined));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
