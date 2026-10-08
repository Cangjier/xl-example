// xl:title (function () { class A { #x = 1; get() { return this.#x; } } return new A().get(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #x = 1; get() { return this.#x; } } return new A().get(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
