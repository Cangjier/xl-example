// xl:title (function () { class A { #p = 1; m() { return this.#p; } } return new A().m(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #p = 1; m() { return this.#p; } } return new A().m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
