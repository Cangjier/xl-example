// xl:title 构造与 `bind` 的形状：`new` 的返回值、`prototype`、`new.target`
// xl:round 753
// xl:judge stdout
// xl:want differ
// xl:why **绑定数的 `prototype` 那一格：用目标那一格，但不是「自有」**——
// xl:why 第 6 / 7 行已经量到 `G.prototype === undefined`（Node 与第 753 轮修好之后的**两边都是真**：
// xl:why `Object.prototype.hasOwnProperty.call(G, "prototype")` 也是假），
// xl:why 而第 8 行 `new G() instanceof F` 在 Node 里是真、这一轮也修成了真
// xl:why （`bind` 那一支把**目标的 `prototype`** 转抄到绑定对象上——规范里 `[[Construct]]`
// xl:why 对绑定函数就是转交给目标）。
// xl:why **留下的这一格**：Node 里两边**同时**成立（`G.prototype` 是 `undefined`、而 `new G()` 用目标的原型）
// xl:why 是因为绑定函数**没有自有 `prototype` 那一格**、构造时目标自己去找；
// xl:why 本仓的 `new` 是从**被调的那个值**上取那一格的 ⇒ 要两件事同时成立，
// xl:why 就得让 `new` 认得「这是个绑定对象、原型去目标那里取」（`vm.xl.md` 的 `CreateInstance`），
// xl:why 而那是**每一次 `new` 都要过的路**——第 750 轮 `a.length = "2"` 那条同样的取舍，先登记、不顺手改。
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
