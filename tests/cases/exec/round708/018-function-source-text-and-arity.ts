// xl:title 函数的源码文本与形参个数
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

function f(a) {}
console.log(show(f.toString().indexOf("function f") === 0) + "," + show(f.length));

(() => {
const o = { m(a) {}, get g() {} };
console.log(show(o.m.length) + "," + show(Object.getOwnPropertyDescriptor(o, "g").get.length));
})();
