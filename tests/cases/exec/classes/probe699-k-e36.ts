// xl:title class A { constructor() { this.z = new.target === A; } } new A().z
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { constructor() { this.z = new.target === A; } } return (new A().z); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
