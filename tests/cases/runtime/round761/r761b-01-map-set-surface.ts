// xl:title `Map` / `Set` 的成员面：SameValueZero 的键、三个迭代器、`forEach` 的次序
// xl:round 761
// xl:judge stdout
// xl:note 第 761 轮普查里**全过**的一片，收进矩阵当守卫（含 `NaN` 与 `-0` 当键、
// xl:note `undefined` 当键、`keys` / `values` / `entries` 三个迭代器、`delete` / `clear` /
// xl:note `forEach` 的 (value, key) 次序、`WeakMap` 的键身份、`toString` 的标签）。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('01 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return m.get(1) + ":" + m.has(1) + ":" + m.size; })()));
console.log('02 (function () { const m = new Map()', show(() => (function () { const m = new Map(); m.set(undefined, 1); return m.get(undefined); })()));
console.log('03 (function () { const m = new Map([', show(() => (function () { const m = new Map([[NaN, 1]]); return m.get(NaN); })()));
console.log('04 (function () { const m = new Map([', show(() => (function () { const m = new Map([[0, 1]]); return m.get(-0); })()));
console.log('05 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2], [3, 4]]); return [...m.keys()].join(","); })()));
console.log('06 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2], [3, 4]]); return [...m.values()].join(","); })()));
console.log('07 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return JSON.stringify([...m.entries()]); })()));
console.log('08 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return m.delete(9) + ":" + m.size; })()));
console.log('09 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); m.clear(); return m.size; })()));
console.log('10 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); let out = 0; m.forEach((v, k) => { out = out + v + k; }); return out; })()));
console.log('11 (function () { const m = new Map()', show(() => (function () { const m = new Map(); return m.set(1, 2).set(3, 4).size; })()));
console.log('12 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return [...s].join(","); })()));
console.log('13 (function () { const s = new Set([', show(() => (function () { const s = new Set([1]); s.clear(); return s.size; })()));
console.log('14 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return JSON.stringify([...s.entries()]); })()));
console.log('15 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return Object.prototype.toString.call(m); })()));
console.log('16 (function () { const s = new Set()', show(() => (function () { const s = new Set(); return Object.prototype.toString.call(s); })()));
console.log('17 (function () { const wm = new Weak', show(() => (function () { const wm = new WeakMap(); return typeof wm.get; })()));
console.log('18 (function () { const wm = new Weak', show(() => (function () { const wm = new WeakMap(); const k: any = {}; wm.set(k, 1); return wm.has(k) + ":" + wm.has({}); })()));
console.log('19 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return JSON.stringify([...m]); })()));
console.log('20 (function () { return new Map().si', show(() => (function () { return new Map().size === 0; })()));
