// xl:title console.log 的原始值渲染：字符串引号 / 数字 / 特殊值
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log("a b", "a'b", 'a"b');

(() => {
console.log(1, 1.5, -0, NaN, Infinity, 1e21, 0.1 + 0.2);
})();

(() => {
console.log(null, undefined, true, [undefined, null]);
})();
