// xl:title class A { x = 1 } class B extends A { y = this.init(); init() { return 4; } } new B().y
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { x = 1 } class B extends A { y = this.init(); init() { return 4; } } return (new B().y); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
