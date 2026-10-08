// xl:title class A { constructor(v) { this.v = v; } } new A(3).v
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { constructor(v) { this.v = v; } } return (new A(3).v); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
