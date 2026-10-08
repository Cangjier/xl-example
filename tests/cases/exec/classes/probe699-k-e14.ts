// xl:title class A { #m() { return 2; } call() { return this.#m(); } } new A().call()
// xl:round 699
// xl:judge stdout
// xl:end
const show = (v) => (v === null ? "null" : typeof v + ":" + String(v));
try {
  console.log(show((() => { class A { #m() { return 2; } call() { return this.#m(); } } return (new A().call()); })()));
} catch (e) {
  console.log("throw:" + (e && e.constructor ? e.constructor.name : "?"));
}
