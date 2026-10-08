// xl:title (function () { class A { #x = 1; get x() { return this.#x; } set x(v) { this.#x = v; } } const a = new A(); a.x = 5; return a.x; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #x = 1; get x() { return this.#x; } set x(v) { this.#x = v; } } const a = new A(); a.x = 5; return a.x; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
