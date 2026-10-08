// xl:title 静态方法与实例方法的 this
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { m() { return this === undefined ? "u" : "o"; } static s() { return this === A; } }
const a = new A();
console.log(show(a.m()) + "," + show(A.s()));
