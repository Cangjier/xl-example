// xl:title class A { get g() { return 1; } set g(v) { this.v = v; } } const a = new A(); a.g = 2; a.v
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { get g() { return 1; } set g(v) { this.v = v; } } const a = new A(); a.g = 2; return (a.v); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
