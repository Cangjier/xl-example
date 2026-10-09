// xl:title 数值文本：字符串解析与进制 / 指数字面量
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Number("1_0")) + "," + show(Number("Infinity")) + "," + show(Number([])) + "," + show(Number([5])));

(() => {
console.log(show(0x10) + "," + show(0b101) + "," + show(0o17) + "," + show(1e3) + "," + show(.5));
})();
