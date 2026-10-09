// xl:title 计算键的方法与字段
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { ["m" + 1]() { return 1; } ["f" + 2] = 3; }
const a = new A();
console.log(show(a.m1()) + "," + show(a.f2) + "," + show(Object.keys(a).join("|")));
