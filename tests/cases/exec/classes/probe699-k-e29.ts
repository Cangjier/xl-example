// xl:title class A { m(a, b) {} } A.prototype.m.length
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { m(a, b) {} } return (A.prototype.m.length); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
