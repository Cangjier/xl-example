// xl:title 属性枚举的次序：数字键 / 字符串键 / 符号键 / 删除后再加
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
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { b: 1, 2: 2, a: 3, 1: 4 }; return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { b: 1, 2: 2, a: 3, 1: 4 }; return JSON.stringify(o); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; o[3] = 1; o[1] = 2; o.z = 3; o.a = 4; return JSON.stringify(o); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { b: 1, c: 2 }; delete o.b; o.b = 3; return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { 1: 1, 2: 2 }; delete o[1]; o[1] = 1; return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; o[1.5] = 1; o["01"] = 2; o[-1] = 3; return Object.keys(o).join(","); })()));
console.log('(function () { const s = Symbo', show(() => (function () { const s = Symbol("s"); const o: any = { [s]: 1, a: 2 }; return Object.keys(o).length + ":" + Object.getOwnPropertySymbols(o).length; })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = {}; Object.defineProperty(o, "a", { value: 1, enumerable: false }); o.b = 2; return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { 4294967294: 1, 4294967295: 2 }; return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { b: 1 }; Object.defineProperty(o, 1, { value: 2, enumerable: true }); return Object.keys(o).join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { a: 1, b: 2, c: 3 }; const out: string[] = []; for (const k in o) out.push(k); return out.join(","); })()));
console.log('(function () { const o: any = ', show(() => (function () { const o: any = { a: 1 }; const ks: string[] = []; for (const k in o) { delete o.a; ks.push(k); } return ks.join(","); })()));
