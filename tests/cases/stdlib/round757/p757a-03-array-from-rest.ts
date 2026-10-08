// xl:title Array.from 的类数组、迭代器与映射函数
// xl:round 757
// xl:judge stdout
// xl:note 第 757 轮普查里 `Array.from` 那一支**除空值之外全过**：类数组、`length` 的
// xl:note 小数与负数、字符串、`Set` / `Map` / 生成器、映射函数与 `thisArg`、洞。
// xl:note 与 `p757a-02` 成对：那一条量空值，这一条量其余——谁动了两条里的一条，这里会响。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { return Array.from({', show(() => (function () { return Array.from({ length: 2 }).join(","); })()));
console.log('2 (function () { return Array.from({', show(() => (function () { return Array.from({ length: 2 }, (v: any, i: any) => i).join(","); })()));
console.log('3 (function () { return Array.from({', show(() => (function () { return Array.from({ 0: "a", 1: "b", length: 2 }).join(","); })()));
console.log('4 (function () { return Array.from({', show(() => (function () { return Array.from({ 0: "a", 1: "b", length: 1 }).join(","); })()));
console.log('5 (function () { return Array.from({', show(() => (function () { return Array.from({ 0: "a", length: 3 }).join(","); })()));
console.log('6 (function () { return Array.from("', show(() => (function () { return Array.from("abc").join(","); })()));
console.log('7 (function () { return Array.from(n', show(() => (function () { return Array.from(new Set([1, 2])).join(","); })()));
console.log('8 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return Array.from(m).length; })()));
console.log('9 (function () { return Array.from({', show(() => (function () { return Array.from({ length: -1 }).length; })()));
console.log('10 (function () { return Array.from({', show(() => (function () { return Array.from({ length: 2.7 }).length; })()));
console.log('11 (function () { return Array.from([', show(() => (function () { return Array.from([1, 2], (v: any) => v * 2).join(","); })()));
console.log('12 (function () { const g = (function', show(() => (function () { const g = (function* () { yield 1; yield 2; })(); return Array.from(g).join(","); })()));
console.log('13 (function () { return Array.from(n', show(() => (function () { return Array.from(new Set([1, 2]), (v: any) => v * 3).join(","); })()));
console.log('14 (function () { const o: any = { le', show(() => (function () { const o: any = { length: 1 }; return Array.from([1, , 3]).length; })()));
console.log('15 (function () { return Array.from({', show(() => (function () { return Array.from({ length: 2 }, function (this: any, v: any) { return this.k; }, { k: 7 }).join(","); })()));
