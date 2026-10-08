// xl:title class A { get x() { return 1; } } class B extends A { x = 2 } new B().x
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { get x() { return 1; } } class B extends A { x = 2 } return (new B().x); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
