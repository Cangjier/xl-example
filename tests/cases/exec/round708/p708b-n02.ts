// xl:title 大整数与安全范围
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(2 ** 53) + "," + show(2 ** 53 + 1) + "," + show(Number.isSafeInteger(2 ** 53)));
