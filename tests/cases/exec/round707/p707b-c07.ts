// xl:title 私有字段的读写
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { #x = 1; get x() { return this.#x; } set x(v) { this.#x = v; } }
const a = new A(); a.x = 5;
console.log(show(a.x) + "," + show(Object.keys(a).length));
