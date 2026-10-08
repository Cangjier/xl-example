// xl:title class A { x = 1 } const a = new A(); delete a.x; 'x' in a
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { x = 1 } const a = new A(); delete a.x; return ('x' in a); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
