// xl:title class A { x = 1 } const a = new A(); a.hasOwnProperty('x')
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { x = 1 } const a = new A(); return (a.hasOwnProperty('x')); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
