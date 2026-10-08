// xl:title (function () { class A { #m() { return 1; } call() { return this.#m(); } } return new A().call(); })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { #m() { return 1; } call() { return this.#m(); } } return new A().call(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
