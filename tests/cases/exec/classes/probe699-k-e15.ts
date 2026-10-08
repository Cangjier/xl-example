// xl:title class A { static #s = 3; static get() { return A.#s; } } A.get()
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { static #s = 3; static get() { return A.#s; } } return (A.get()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
