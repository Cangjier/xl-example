// xl:title super 属性与 super 方法两条路
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { get v() { return 1; } m() { return "A"; } }
class B extends A { get v() { return super.v + 1; } m() { return super.m() + "B"; } }
const b = new B();
console.log(show(b.v) + "," + show(b.m()));
