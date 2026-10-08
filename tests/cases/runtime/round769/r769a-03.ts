// xl:title 查找族与负数起点
// xl:round 769
// xl:judge stdout
// xl:want differ
// xl:why `findLast(undefined)` 该抛 `TypeError`、本仓抛的是笼统的 `Error`——内建实参校验那一族抛错了族（与 `r769b-01` 第 13 / 14 行同一个根）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3, 2]; return String(a.indexOf(2, -2)); })()));
console.log('02 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3, 2]; return String(a.lastIndexOf(2, -2)); })()));
console.log('03 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.includes(2, -1)); })()));
console.log('04 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.indexOf(2, Infinity)); })()));
console.log('05 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.lastIndexOf(2, -Infinity)); })()));
console.log('06 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.indexOf(2, NaN)); })()));
console.log('07 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.indexOf(2, '1' as any)); })()));
console.log('08 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.includes(2, true as any)); })()));
console.log('09 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.at('1' as any)); })()));
console.log('10 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.at(-1)); })()));
console.log('11 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.at(1.5 as any)); })()));
console.log('12 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.findLast((x: any) => x < 3)); })()));
console.log('13 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.findLastIndex((x: any) => x < 3)); })()));
console.log('14 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.findLastIndex((x: any) => x > 9)); })()));
console.log('15 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return String(a.findLast(undefined as any)); })()));
