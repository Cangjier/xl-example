// xl:title class A {} class B extends A { constructor() { super(); this.ok = new.target === B; } } new B().ok
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A {} class B extends A { constructor() { super(); this.ok = new.target === B; } } return (new B().ok); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
