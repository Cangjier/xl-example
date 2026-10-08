// xl:title class A { static get g() { return 5; } } class B extends A {} B.g
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { static get g() { return 5; } } class B extends A {} return (B.g); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
