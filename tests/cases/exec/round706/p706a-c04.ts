// xl:title 静态成员挂在构造器上
// xl:round 706
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { static s() { return 1; } }
console.log(show(typeof A.s) + "," + show(Object.getOwnPropertyNames(A).includes("s")) + "," + show(A.prototype.s));
