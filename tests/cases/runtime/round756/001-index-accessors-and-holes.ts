// xl:title 下标访问器与数组的洞
// xl:round 756
// xl:judge stdout
// xl:note 第 756 轮普查里的一条（期望值由 `node` 现给，打印口径 `typeof:值`）
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = []; Object.defineProperty(a, 0, { get() { return 9; }, enumerable: true, configurable: true }); return a[0]; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = []; Object.defineProperty(a, 1, { get() { return 9; }, enumerable: true, configurable: true }); return a.length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; Object.defineProperty(a, 0, { get() { return 9; } }); return a.join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; Object.defineProperty(a, 0, { get() { return 9; } }); return JSON.stringify(a); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; Object.defineProperty(a, 5, { value: 9, enumerable: true }); return a.length + ":" + Object.keys(a).join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; Object.defineProperty(a, "0", { get() { return 9; } }); return a[0]; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1]; return Object.getOwnPropertyDescriptor(a, "0").enumerable; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1]; return a.hasOwnProperty(0); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = []; a[3] = 1; return Object.keys(a).join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = []; a[3] = 1; return JSON.stringify(a); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = []; a[3] = 1; return a.filter(() => true).length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; delete a[0]; return a.length + ":" + Object.keys(a).join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; return a.map((x: any, i: any) => i).join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; return Object.assign([], a).length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; return [...a].length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, 2]; return Array.from(a).length; })()));
