// xl:title 原始值接收者上的下标写：字符串那一格必须被静默丢掉
// xl:round 778
// xl:judge stdout
// xl:end
// 第 778 轮普查面：第 777 轮刚把**下标读**在原始值上收进 `ToObject` 那一路，
// 写那一侧（`set_index`）此前只在数字 / 布尔上量过。字符串接收者是**唯一有内部槽**的那一档
// （`s[0] = "x"` 在 JS 里一声不响、值不变），下标与点号两条路必须给同一个答案。
// 另钉「读得到、写不进」的边界：`length` 与字符串自己的下标格子都是只读的。
const show = (v: any): string => (typeof v === "string" ? JSON.stringify(v) : String(v));
const run = (f: () => any): string => { try { return show(f()); } catch (e: any) { return "throw:" + e.constructor.name; } };
console.log('01 字符串下标写静默', run(() => { const s: any = "abc"; s[0] = "z"; return s[0] + s; }));
console.log('02 字符串点号写静默', run(() => { const s: any = "abc"; s.x = 1; return typeof s.x; }));
console.log('03 字符串 length 写不进去', run(() => { const s: any = "abc"; s.length = 9; return s.length; }));
console.log('04 字符串越界下标写', run(() => { const s: any = "abc"; s[9] = "z"; return s[9] + ":" + typeof s[9] + ":" + s.length; }));
console.log('05 数字下标写静默', run(() => { const n: any = 5; n[0] = 1; return typeof n[0]; }));
console.log('06 布尔下标写静默', run(() => { const b: any = true; b[0] = 1; return typeof b[0]; }));
console.log('07 空值下标写抛 TypeError', run(() => { const u: any = null; u[0] = 1; return "no"; }));
console.log('08 undefined 下标写抛 TypeError', run(() => { const u: any = undefined; u[0] = 1; return "no"; }));
console.log('09 字符串下标 delete', run(() => { const s: any = "abc"; return show(delete s[0]) + ":" + s[0]; }));
console.log('10 字符串 length delete', run(() => { const s: any = "abc"; return show(delete s.length) + ":" + s.length; }));
console.log('11 数字下标 delete', run(() => { const n: any = 5; return show(delete n[0]); }));
console.log('12 空值下标 delete 抛', run(() => { const u: any = null; return show(delete u[0]); }));
console.log('13 字符串读回来的还是那一格', run(() => { const s: any = "abc"; return [s[1], s["1"], s.length].join(","); }));
console.log('14 对象那条路不许被带偏', run(() => { const o: any = {}; o[0] = "v"; return o[0] + ":" + Object.keys(o).join(","); }));
console.log('15 数组那条路不许被带偏', run(() => { const a: any = []; a[2] = "v"; return a.length + ":" + a[2]; }));
console.log('16 包装对象上写得进去', run(() => { const w: any = Object("abc"); const before = w[0]; w[0] = "z"; return before + ":" + w[0] + ":" + w.length; }));
console.log('17 字符串上 defineProperty 该抛', run(() => { const s: any = "abc"; Object.defineProperty(s, "0", { value: "z" }); return s[0]; }));
console.log('18 数字上 defineProperty 该抛', run(() => { const n: any = 5; Object.defineProperty(n, "x", { value: 1 }); return (n as any).x; }));
