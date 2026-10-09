// xl:title 构造与 `bind` 的形状：`new` 的返回值、`prototype`、`new.target`
// xl:round 753
// xl:judge stdout
// xl:note 第 890 轮转绿（`xl:want differ` 与那几行 `xl:why` 按规矩撤掉，用例留着当守卫）：
// xl:note 缺口原来是「绑定对象有**自有**的 `prototype`」——第 753 轮为了让
// xl:note `new (F.bind(null))() instanceof F` 成立，把目标的 `prototype` 转抄到了绑定对象上，
// xl:note 于是 `G.prototype` 给的是 `F.prototype`（Node 给 `undefined`）。
// xl:note 现在那一格是**记账格**（`PropertyFlagInternal`，`heap.xl.md`）：
// xl:note 用户口径的读 / `in` / 自有名表都看不见它，而 `CreateInstance`（`vm.xl.md`）与
// xl:note `RtInstanceOf`（`rt.xl.md`）走 `GetInternalProperty` 照旧读得到
// xl:note ⇒「`G.prototype` 是 `undefined`」与「`new G() instanceof F` 是真」同时成立。
// xl:end
const show = (f: () => any) => {
  try {
    const v = f();
    return "ok:" + (typeof v) + ":" + (v === null ? "null" : (typeof v === "object" || typeof v === "function") ? Object.prototype.toString.call(v).slice(8, -1) : String(v));
  } catch (e) {
    return "throw:" + (e as Error).constructor.name;
  }
};
console.log('(function () { function F(this', show(() => (function () { function F(this: any) { this.a = 1; } return new (F as any)().a; })()));
console.log('(function () { function F(this', show(() => (function () { function F(this: any) { this.a = 1; return { b: 2 }; } return new (F as any)().b; })()));
console.log('(function () { function F(this', show(() => (function () { function F(this: any) { this.a = 1; return 7; } return new (F as any)().a; })()));
console.log('(function () { function F(this', show(() => (function () { function F(this: any) { console.log("t", new.target === F); } new (F as any)(); F(); return 1; })()));
console.log('(function () { function F(this', show(() => (function () { function F(this: any) {} const G: any = (F as any).bind(null); return G.prototype === undefined; })()));
console.log('(function () { function F(this', show(() => (function () { function F(this: any) {} const G: any = (F as any).bind(null); return new G() instanceof F; })()));
console.log('(function () { function F(a: a', show(() => (function () { function F(a: any, b: any) { this.s = a + b; } const G: any = (F as any).bind(null, 1); return new G(2).s; })()));
