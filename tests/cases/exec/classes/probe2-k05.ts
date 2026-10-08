// xl:title (function () { class A { static #s = 2; static get() { return A.#s; } } return A.get(); })()
// xl:round 692
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static #s = 2; static get() { return A.#s; } } return A.get(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
