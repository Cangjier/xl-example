// xl:title 原型上的 getter 不带自有格
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { get x() { return 1; } }
console.log(show(Object.keys(new A()).length) + "," + show(Object.getOwnPropertyNames(A.prototype).join("|")));
