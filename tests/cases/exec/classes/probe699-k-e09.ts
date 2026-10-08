// xl:title class A { get g() { return 3; } } class B extends A { get g() { return super.g + 1; } } new B().g
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { get g() { return 3; } } class B extends A { get g() { return super.g + 1; } } return (new B().g); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
