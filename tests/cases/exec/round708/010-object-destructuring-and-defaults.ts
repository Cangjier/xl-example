// xl:title 对象解构：缺省 / 重命名 / 嵌套 / 计算键
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

const { a: x = 5, b = 6 } = { a: 1 };
console.log(show(x) + "," + show(b));

(() => {
const { a: { b = 2 } = {} } = {};
console.log(show(b));
})();

(() => {
const { a = 1, b = 2 } = { a: null, b: 0 };
console.log(show(a) + "," + show(b));
})();

(() => {
const k = "x"; const { [k]: v = 1 } = {};
console.log(show(v));
})();
