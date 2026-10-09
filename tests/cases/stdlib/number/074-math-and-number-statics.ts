// xl:title `Number` 的常量与断言族
// xl:round 691
// xl:judge stdout
// xl:end
console.log(Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER, Number.POSITIVE_INFINITY);
console.log(Number.isInteger(1.0), Number.isInteger(1.5), Number.isSafeInteger(2 ** 53));
console.log(Number.isNaN(NaN), Number.isNaN("NaN"), Number.isFinite("1"), Number.isFinite(1));

// ===== 第 796 轮：吸收 tests/cases/stdlib/round719/p719a-n11.ts（第 1–2 行）=====
(() => {
const show = (v) => (v === null ? "null"
  : v === undefined ? "undefined"
  : typeof v === "symbol" ? "symbol"
  : typeof v + ":" + String(v).split("\n").join("\\n"));
const t = (f) => { try { return show(f()); } catch (e) { return "throw:" + (e && e.constructor ? e.constructor.name : "?"); } };

console.log(t(() => Number.EPSILON + "|" + Number.MAX_SAFE_INTEGER + "|" + Number.MIN_SAFE_INTEGER));
console.log(t(() => Number.POSITIVE_INFINITY + "|" + Number.NEGATIVE_INFINITY + "|" + Number.NaN));
})();
