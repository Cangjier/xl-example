// xl:title 字符串与数字的格式化边角
// xl:round 755
// xl:judge stdout
// xl:note 第 755 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { return (1234.56', show(() => (function () { return (1234.5678).toFixed(2); })()));
console.log('(function () { return (0.00000', show(() => (function () { return (0.000001).toFixed(2); })()));
console.log('(function () { return (-1.5).t', show(() => (function () { return (-1.5).toFixed(0); })()));
console.log('(function () { return (1234.56', show(() => (function () { return (1234.5678).toPrecision(3); })()));
console.log('(function () { return (1234.56', show(() => (function () { return (1234.5678).toExponential(2); })()));
console.log('(function () { return (255).to', show(() => (function () { return (255).toString(16); })()));
console.log('(function () { return (-255).t', show(() => (function () { return (-255).toString(16); })()));
console.log('(function () { return (0.1 + 0', show(() => (function () { return (0.1 + 0.2).toString(); })()));
console.log('(function () { return String(1', show(() => (function () { return String(1e21); })()));
console.log('(function () { return String(1', show(() => (function () { return String(1e-7); })()));
console.log('(function () { return parseInt', show(() => (function () { return parseInt("0x10"); })()));
console.log('(function () { return parseInt', show(() => (function () { return parseInt("10", 2); })()));
console.log('(function () { return parseFlo', show(() => (function () { return parseFloat("1.5e3"); })()));
console.log('(function () { return Number("', show(() => (function () { return Number(""); })()));
console.log('(function () { return Number("', show(() => (function () { return Number("  12  "); })()));
console.log('(function () { return Number.i', show(() => (function () { return Number.isInteger(1.0); })()));
console.log('(function () { return (1.005).', show(() => (function () { return (1.005).toFixed(2); })()));
console.log('(function () { return Math.rou', show(() => (function () { return Math.round(-0.5) + ":" + Math.round(0.5); })()));
console.log('(function () { return Math.max', show(() => (function () { return Math.max() + ":" + Math.min(); })()));
console.log('(function () { return Math.max', show(() => (function () { return Math.max(1, NaN); })()));
