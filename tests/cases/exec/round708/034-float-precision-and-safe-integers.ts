// xl:title 浮点精度与安全整数范围
// xl:round 708
// xl:judge stdout
// xl:end

const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

console.log(show(0.1 + 0.2) + "," + show(0.3 - 0.1) + "," + show(1 / 3));

(() => {
console.log(show(2 ** 53) + "," + show(2 ** 53 + 1) + "," + show(Number.isSafeInteger(2 ** 53)));
})();
