// xl:title 下标位上的访问器：复制族与读取族都该读到那个值
// xl:round 769
// xl:judge stdout
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { const a: any = []; ', show(() => (function () { const a: any = []; Object.defineProperty(a, 0, { get: () => 7, configurable: true }); a.length = 2; return JSON.stringify(a.toReversed()); })()));
console.log('02 (function () { const a: any = []; ', show(() => (function () { const a: any = []; Object.defineProperty(a, 0, { get: () => 7, configurable: true }); a.length = 2; return JSON.stringify(a.with(1, 8)); })()));
console.log('03 (function () { const a: any = []; ', show(() => (function () { const a: any = []; Object.defineProperty(a, 0, { get: () => 7, configurable: true }); a.length = 2; return JSON.stringify(a.slice()); })()));
console.log('04 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.with(5, 8)); })()));
console.log('05 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.with(-5, 8)); })()));
console.log('06 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.with(1.7, 8)); })()));
console.log('07 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.toSpliced(1)); })()));
console.log('08 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.toSpliced(-1, 1)); })()));
console.log('09 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.toSpliced(1, -1)); })()));
console.log('10 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2, 3]; return JSON.stringify(a.toSpliced(1, 99)); })()));
console.log('11 (function () { const a: any = [3, ', show(() => (function () { const a: any = [3, 1, 2]; return JSON.stringify(a.toSorted()); })()));
console.log('12 (function () { const a: any = [3, ', show(() => (function () { const a: any = [3, 1, 2]; return JSON.stringify(a.toSorted(undefined)); })()));
console.log('13 (function () { const a: any = [\'b\'', show(() => (function () { const a: any = ['b', 'a']; return JSON.stringify(a.toSorted()); })()));
console.log('14 (function () { const a: any = [10,', show(() => (function () { const a: any = [10, 9]; return JSON.stringify(a.toSorted()); })()));
console.log('15 (function () { const a: any = [1, ', show(() => (function () { const a: any = [1, 2]; return JSON.stringify(a.toSorted(null)); })()));
