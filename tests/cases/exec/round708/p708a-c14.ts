// xl:title 类字段与同名方法
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { m() { return "method"; } }
const a = new A();
console.log(show(typeof a.m) + "," + show(Object.getOwnPropertyNames(A.prototype).join("|")));
