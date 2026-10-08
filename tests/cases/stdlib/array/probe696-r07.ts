// xl:title Array.prototype.reduceRight.call({ length: 3, 0: "a", 1: "b", 2: "c" }, (a, b) => a + b)
// xl:round 696
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show(Array.prototype.reduceRight.call({ length: 3, 0: "a", 1: "b", 2: "c" }, (a, b) => a + b)));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
