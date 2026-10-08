// xl:title JSON.stringify(Array.prototype.map.call({ length: 2 }, (v) => v))
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(JSON.stringify(Array.prototype.map.call({ length: 2 }, (v) => v))));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
