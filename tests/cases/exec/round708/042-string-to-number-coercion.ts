// xl:title 字符串到数字与数字到字符串的转换
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Number("  12  ")) + "," + show(Number("0x10")) + "," + show(Number("")) + "," + show(Number("1e2")));

(() => {
const o = { toString() { return "T"; } };
console.log(show(String(o)) + "," + show(String(null)) + "," + show(String([1, 2])));
})();
