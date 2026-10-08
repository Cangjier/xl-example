// xl:title 数字那一族的格式化：`toLocaleString` 不再印成 `[object Number]`
// xl:round 759
// xl:judge stdout
// xl:want differ
// xl:why **收掉的是哪一处**（第 759 轮，普查当场红的）：`(123456.789).toLocaleString()`
// xl:why 原来给 **`"[object Number]"`**（Node 给 `"123,456.789"`）——
// xl:why 根子是 `Number.prototype` 上**没有 `toLocaleString` 那一格**，于是沿链落到
// xl:why `Object.prototype.toLocaleString`，而它调的是承接对象的
// xl:why `Object.prototype.toString` ⇒ **把数字印成了一个标签**。
// xl:why 第 759 轮把它指到 `NumberToStringRadix`（与 `toString` **同一个号**），
// xl:why 先例是第 689 轮 `Object.prototype.toLocaleString` 指到 `ObjectToString`、
// xl:why `Array.prototype.toLocaleString` 指到 `ArrayJoin`（本仓没有区域设置表，
// xl:why 两格给的一定是同一个串）。
// xl:why **现在差的是哪一半**：只剩**千分位**（`"123,456.789"` 对 `"123456.789"`）——
// xl:why 那要 ICU 的区域表，与 `toDateString` / `Intl` 那一族同一件事。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { return (1234.5678).', show(() => (function () { return (1234.5678).toFixed(2); })()));
console.log('2 (function () { return (1234.5678).', show(() => (function () { return (1234.5678).toPrecision(3); })()));
console.log('3 (function () { return (1234.5678).', show(() => (function () { return (1234.5678).toExponential(2); })()));
console.log('4 (function () { return (255).toStri', show(() => (function () { return (255).toString(16) + ":" + (255).toString(2); })()));
console.log('5 (function () { return (0.1).toFixe', show(() => (function () { return (0.1).toFixed(20); })()));
console.log('6 (function () { return (1e21).toFix', show(() => (function () { return (1e21).toFixed(2); })()));
console.log('7 (function () { return (10000000000', show(() => (function () { return (1000000000000000000000).toString(); })()));
console.log('8 (function () { return (1e-7).toStr', show(() => (function () { return (1e-7).toString(); })()));
console.log('9 (function () { return (123456.789)', show(() => (function () { return (123456.789).toLocaleString(); })()));
console.log('10 (function () { return (1.005).toFi', show(() => (function () { return (1.005).toFixed(2); })()));
console.log('11 (function () { return String(-0); ', show(() => (function () { return String(-0); })()));
console.log('12 (function () { return (2 ** 53).to', show(() => (function () { return (2 ** 53).toString(); })()));
console.log('13 (function () { const d = new Date(', show(() => (function () { const d = new Date(0); return d.getTime(); })()));
console.log('14 (function () { const d = new Date(', show(() => (function () { const d = new Date(0); return d.getUTCFullYear(); })()));
console.log('15 (function () { const d = new Date(', show(() => (function () { const d = new Date(0); return d.toISOString(); })()));
console.log('16 (function () { const d = new Date(', show(() => (function () { const d = new Date(Date.UTC(2020, 0, 2, 3, 4, 5, 6)); return d.toISOString(); })()));
console.log('17 (function () { const d = new Date(', show(() => (function () { const d = new Date("2020-01-02T03:04:05.006Z"); return d.getTime(); })()));
console.log('18 (function () { return new Date(202', show(() => (function () { return new Date(2020, 0, 2).getFullYear(); })()));
console.log('19 (function () { const d = new Date(', show(() => (function () { const d = new Date(0); return d.getTimezoneOffset() !== undefined; })()));
console.log('20 (function () { return typeof Date.', show(() => (function () { return typeof Date.now(); })()));
console.log('21 (function () { const d = new Date(', show(() => (function () { const d = new Date(0); return d.toJSON(); })()));
console.log('22 (function () { return new Date(NaN', show(() => (function () { return new Date(NaN).getTime(); })()));
console.log('23 (function () { return new Date(0) ', show(() => (function () { return new Date(0) instanceof Date; })()));
console.log('24 (function () { return Date.parse("', show(() => (function () { return Date.parse("2020-01-02T03:04:05.006Z"); })()));
