// xl:title (function () { class A { static #s = 1; static get s() { return A.#s; } } return A.s; })()
// xl:round 694
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static #s = 1; static get s() { return A.#s; } } return A.s; })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
