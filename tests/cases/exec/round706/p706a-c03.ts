// xl:title 类的实例方法可枚举性是假
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { m() {} }
console.log(show(Object.getOwnPropertyDescriptor(A.prototype, "m").enumerable) + "," + show(Object.keys(A.prototype).length));
