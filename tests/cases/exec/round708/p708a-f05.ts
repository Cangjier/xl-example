// xl:title 函数表达式与具名递归
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const f = function fact(n) { return n <= 1 ? 1 : n * fact(n - 1); };
console.log(show(f(5)) + "," + show(typeof fact));
