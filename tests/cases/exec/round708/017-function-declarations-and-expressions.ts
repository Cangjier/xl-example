// xl:title 函数声明的提升与具名函数表达式的自引用
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(typeof f));
function f() { return 1; }

(() => {
const f = function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); };
console.log(show(f(5)) + "," + show(typeof fact));
})();
