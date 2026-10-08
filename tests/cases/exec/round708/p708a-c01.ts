// xl:title 构造函数的 name / length / prototype
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { constructor(x, y) {} }
console.log(show(A.name) + "," + show(A.length) + "," + show(A.prototype.constructor === A));
