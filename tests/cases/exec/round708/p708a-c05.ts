// xl:title 方法简写的 name 与 length
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { m(a, b) {} }
console.log(show(A.prototype.m.name) + "," + show(A.prototype.m.length));
