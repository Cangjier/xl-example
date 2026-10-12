// xl:title `Map` / `Set` 的内部载荷是**可见的自有属性**（`__k` / `__v`）
// xl:round 759
// xl:judge stdout
// xl:want differ
// xl:why **第 21 行是缺口**（第 759 轮量的）：`new Map([[1, 2]])["__k"]` 在 Node 里是
// xl:why `undefined`，本仓拿得到那个内部表（判据 `stdlib/map-set/probe703-m-d10`
// xl:why 登的是同一条根：本仓把 `Map` / `Set` 做成「带几格隐藏属性的普通对象」，
// xl:why 而**隐藏**只做到「不进 `Object.keys`」这一层）。
// xl:why **其余 23 行全对**：`add` / `delete` / `has` / `clear`、键相等（`NaN` / `-0` /
// xl:why 字符串与数不同键、对象按身份）、迭代顺序、`forEach` 的三个实参、
// xl:why `entries` / `keys` / `values` 的形状、`WeakMap` / `WeakSet`。
// xl:why **要做就得让属性读那一侧也跳过隐藏格**——那是引擎侧的一处改动，
// xl:why 牵动面比这一条大（与 `probe703-m-d10` 同一句），先记在这里。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('1 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2, 2, 3]); return s.size + ":" + [...s].join(","); })()));
console.log('2 (function () { const s = new Set()', show(() => (function () { const s = new Set(); s.add(1); s.add(1); return s.size; })()));
console.log('3 (function () { const s = new Set([', show(() => (function () { const s = new Set([1]); return s.add(2) === s; })()));
console.log('4 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return s.delete(2) + ":" + s.delete(9); })()));
console.log('5 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2, 3]); const out: any[] = []; s.forEach((v: any, k: any) => out.push(v === k)); return out.join(","); })()));
console.log('6 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return [...s.entries()].length; })()));
console.log('7 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return [...s.keys()].join(","); })()));
console.log('8 (function () { const s = new Set([', show(() => (function () { const s = new Set([1]); return [...s.values()].join(","); })()));
console.log('9 (function () { const s = new Set([', show(() => (function () { const s = new Set([1]); return s.has(1) + ":" + s.has("1"); })()));
console.log('10 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return new Set(s).size; })()));
console.log('11 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2, 3]); return typeof (s as any).union; })()));
console.log('12 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2, 3]); return typeof (s as any).difference; })()));
console.log('13 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2, 3]); return typeof (s as any).intersection; })()));
console.log('14 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return typeof (m as any).getOrInsert; })()));
console.log('15 (function () { const m = new Map()', show(() => (function () { const m = new Map(); return m.set("a", 1).get("a"); })()));
console.log('16 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2], [3, 4]]); const out: any[] = []; m.forEach((v: any, k: any) => out.push(k + "=" + v)); return out.join(","); })()));
console.log('17 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return m.forEach.length; })()));
console.log('18 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return [...m][0][1]; })()));
console.log('19 (function () { const wm = new Weak', show(() => (function () { const wm = new WeakMap(); const k: any = {}; wm.set(k, 1); return wm.get(k); })()));
console.log('20 (function () { const ws = new Weak', show(() => (function () { const ws = new WeakSet(); const k: any = {}; ws.add(k); return ws.has(k); })()));
console.log('21 (function () { const m = new Map([', show(() => (function () { const m = new Map([[1, 2]]); return m.size + ":" + (m as any).__k; })()));
console.log('22 (function () { const s = new Set([', show(() => (function () { const s = new Set([1, 2]); return String(s); })()));
console.log('23 (function () { return new Set().si', show(() => (function () { return new Set().size; })()));
console.log('24 (function () { return new Map().si', show(() => (function () { return new Map().size; })()));
