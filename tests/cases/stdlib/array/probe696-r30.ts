// xl:title Array.prototype.find.call({ length: 2 }, (v) => v === undefined)
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.find.call({ length: 2 }, (v) => v === undefined)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
