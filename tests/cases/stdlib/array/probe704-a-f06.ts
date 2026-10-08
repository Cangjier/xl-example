// xl:title Array.prototype.join.call({length:2,0:"a",1:"b"}, "-")
// xl:round 704
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.join.call({length:2,0:"a",1:"b"}, "-")));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
