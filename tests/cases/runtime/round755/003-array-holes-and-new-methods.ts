// xl:title 数组的洞与新方法（`splice` / `slice` / `flat` / `at` / `copyWithin`）
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
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.slice().length + ":" + (1 in a.slice()); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.splice(1, 1).length + ":" + (1 in a.splice(0)); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.flat().length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.at(1) === undefined; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.entries().next().value.join(); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return [...a].length; })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return Object.keys(a).join(","); })()));
console.log('(function () { const a: any[] ', show(() => (function () { const a: any[] = [1, , 3]; return a.forEach((x: any, i: number) => i); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3, 4]; a.copyWithin(1, 2); return a.join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3, 4]; return a.copyWithin(0, -2).join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3]; return a.fill(0, -1).join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3]; return a.splice(-1, 1).join() + "|" + a.join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3]; return a.splice(1).join() + "|" + a.join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2, 3]; return a.slice(-2, -1).join(); })()));
console.log('(function () { const a = [5, 3', show(() => (function () { const a = [5, 3, 1]; return a.sort((x: any, y: any) => x - y).join(","); })()));
console.log('(function () { const a = [3, 1', show(() => (function () { const a = [3, 1, 2]; return a.sort().join(","); })()));
console.log('(function () { const a = [1, 2', show(() => (function () { const a = [1, 2]; return a.sort((x: any, y: any) => 0).join(","); })()));
