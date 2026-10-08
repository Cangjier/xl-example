// xl:title getter 与 setter 都在原型上
// xl:round 707
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { get v() { return this._v; } set v(x) { this._v = x * 2; } }
const a = new A(); a.v = 3;
console.log(show(a.v) + "," + show(Object.keys(a).join("|")));
