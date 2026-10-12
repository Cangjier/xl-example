// xl:title 访问器的 this 绑定与私有后备字段
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { #v = 0; get v() { return this.#v; } set v(x) { this.#v = x; } }
const a = new A(); a.v = 4;
console.log(show(a.v));
