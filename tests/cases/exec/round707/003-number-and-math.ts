// xl:title Number 的判定 / 进制 / 格式化 / 边界，以及 Math 的取整、对数、符号与杂项
// xl:round 788
// xl:judge stdout
// xl:end
// **按判定点并组（第 788 轮）**：吸收 `exec/round707` 里逐条一问的 10 条探针
// （`p707a-n01` … `p707a-n05` · `p707a-x01` … `p707a-x05`）。正文逐字搬进各自的 IIFE。
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const run = (f) => { try { f(); } catch (e) { console.log("throw:" + (e && e.constructor ? e.constructor.name : "?")); } };

// Number 的静态判定与边界
(() => {
  console.log(show(Number.isInteger(1.0)) + "," + show(Number.isSafeInteger(2 ** 53)) + "," + show(Number.isNaN("x")) + "," + show(Number.isFinite("1")));
})();
(() => {
  console.log(show(Number.MAX_SAFE_INTEGER) + "," + show(Number.EPSILON > 0) + "," + show(Number.POSITIVE_INFINITY));
})();
// 进制与格式化
(() => {
  console.log(show((255).toString(16)) + "," + show((255).toString(2)) + "," + show((255).toString(36)));
})();
(() => {
  console.log(show((1.005).toFixed(2)) + "," + show((123.456).toPrecision(4)) + "," + show((123.456).toExponential(2)));
})();
(() => {
  console.log(show(parseInt("0x10")) + "," + show(parseInt("10", 2)) + "," + show(parseFloat("1.5abc")) + "," + show(Number("")));
})();
// Math：取整四档
(() => {
  console.log(show(Math.floor(-1.5)) + "," + show(Math.ceil(-1.5)) + "," + show(Math.trunc(-1.5)) + "," + show(Math.round(-1.5)));
})();
// Math：min / max 与 NaN
(() => {
  console.log(show(Math.max()) + "," + show(Math.min()) + "," + show(Math.max(1, NaN)) + "," + show(Math.min(1, "2")));
})();
// Math：对数族
(() => {
  console.log(show(Math.log2(8)) + "," + show(Math.log10(1000)) + "," + show(Math.log1p(0)) + "," + show(Math.expm1(0)));
})();
// Math：符号与零
(() => {
  console.log(show(Math.sign(-3)) + "," + show(Math.sign(0)) + "," + show(Math.sign(-0)) + "," + show(1 / Math.sign(-0)));
})();
// Math：hypot / cbrt / imul / clz32
(() => {
  console.log(show(Math.hypot(3, 4)) + "," + show(Math.cbrt(27)) + "," + show(Math.imul(3, 4)) + "," + show(Math.clz32(1)));
})();
