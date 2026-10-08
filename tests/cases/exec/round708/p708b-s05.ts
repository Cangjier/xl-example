// xl:title 字符串的数字转换
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(Number("  12  ")) + "," + show(Number("0x10")) + "," + show(Number("")) + "," + show(Number("1e2")));
