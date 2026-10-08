// xl:title Symbol.asyncIterator === Symbol.asyncIterator
// xl:round 697
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Symbol.asyncIterator === Symbol.asyncIterator));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
