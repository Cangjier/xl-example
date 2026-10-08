// xl:title 静态字段与实例字段的分界
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { static s = 1; i = 2; }
const a = new A();
console.log(show(A.s) + "," + show(a.i) + "," + show(A.prototype.i) + "," + show(a.s));
