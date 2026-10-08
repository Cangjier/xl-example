// xl:title 解构与展开的边界：默认值只在 `undefined` 上生效、重命名、剩余、嵌套、参数的默认解构
// xl:round 762
// xl:judge stdout
// xl:note 第 762 轮普查里**全过**的一片，收进矩阵当守卫（含 `{ a = 1 }` 在 `null` 上**不**生效、
// xl:note `const { 0: first } = [9, 8]` 按**下标**取而不是按名字、计算键 `{ ["k"]: v }`、
// xl:note 数组与对象的剩余、嵌套里两层同时解构、`f({p = 1} = {})` 与 `f([a = 1] = [])`，
// xl:note 以及 `...` 在实参 / 数组 / 对象 / `Set` 四处不同的落点）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { const { a = 1 } = {', show(() => (function () { const { a = 1 } = {} as any; return a; })()));
console.log('02 (function () { const { a: { b } = ', show(() => (function () { const { a: { b } = { b: 2 } } = {} as any; return b; })()));
console.log('03 (function () { const [x = 5] = [] ', show(() => (function () { const [x = 5] = [] as any; return x; })()));
console.log('04 (function () { const [, y = 6] = [', show(() => (function () { const [, y = 6] = [1] as any; return y; })()));
console.log('05 (function () { const { length } = ', show(() => (function () { const { length } = "abc"; return length; })()));
console.log('06 (function () { const { 0: first } ', show(() => (function () { const { 0: first } = [9, 8] as any; return first; })()));
console.log('07 (function () { const { ["k"]: v } ', show(() => (function () { const { ["k"]: v } = { k: 7 } as any; return v; })()));
console.log('08 (function () { const [a, ...rest] ', show(() => (function () { const [a, ...rest] = [1, 2, 3]; return rest.join(","); })()));
console.log('09 (function () { const { a, ...other', show(() => (function () { const { a, ...others } = { a: 1, b: 2, c: 3 } as any; return JSON.stringify(others); })()));
console.log('10 (function () { const f = ({ p = 1,', show(() => (function () { const f = ({ p = 1, q = 2 } = {}) => p + q; return f(); })()));
console.log('11 (function () { const f2 = ([a = 1,', show(() => (function () { const f2 = ([a = 1, b = 2] = []) => a + b; return f2(); })()));
console.log('12 (function () { const nested: any =', show(() => (function () { const nested: any = { x: [{ y: 3 }] }; const { x: [{ y }] } = nested; return y; })()));
console.log('13 (function () { const { a = 1 } = {', show(() => (function () { const { a = 1 } = { a: undefined } as any; return a; })()));
console.log('14 (function () { const { a = 1 } = {', show(() => (function () { const { a = 1 } = { a: null } as any; return a; })()));
console.log('15 JSON.stringify([...[1], ...[]])', show(() => JSON.stringify([...[1], ...[]])));
console.log('16 JSON.stringify({ ...{ a: 1 }, ...{', show(() => JSON.stringify({ ...{ a: 1 }, ...{ a: 2 } })));
console.log('17 (function () { const fn = (...xs: ', show(() => (function () { const fn = (...xs: number[]) => xs.length; return fn(1, 2, 3); })()));
console.log('18 Math.max(...[1, 2, 3])', show(() => Math.max(...[1, 2, 3])));
console.log('19 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return [...s].length; })()));
