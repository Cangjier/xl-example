// xl:title 方法的 this：静态与实例、取出之后丢失、IIFE 里
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

(() => {
class A { m() { return this === undefined ? "u" : "o"; } }
const a = new A(); const f = a.m;
console.log(show(f()));
})();

(() => {
console.log(show((function () { return this === undefined ? "u" : "o"; })()));
})();
