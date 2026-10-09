// xl:title 类对象自己那一格：name / length / prototype 与方法的 name / length
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

class A { constructor(x, y) {} }
console.log(show(A.name) + "," + show(A.length) + "," + show(A.prototype.constructor === A));

(() => {
class A {}
console.log(show(A.length) + "," + show(A.name));
})();

(() => {
class A { m(a, b) {} }
console.log(show(A.prototype.m.name) + "," + show(A.prototype.m.length));
})();
