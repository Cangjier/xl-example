// xl:title (function () { class A { static #p = 1; static m() { return A.#p; } } return A.m(); })()
// xl:round 693
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((function () { class A { static #p = 1; static m() { return A.#p; } } return A.m(); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
