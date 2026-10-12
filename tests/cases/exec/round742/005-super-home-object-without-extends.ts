// xl:title 没有 `extends` 的类里，`super` 的家对象是当前类自己的原型
// xl:round 742
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p742d-d01`；正文一字未动）。
// 判定点只有一个：**不写 `extends` 时 `super` 的家对象**——它落在
// `Object.prototype` 那一格上（`super.toString` / `super.hasOwnProperty` 取得到、
// 类自己写了同名方法则取自己的），静态方法里也一样；
// `super.m()` 取不到方法要抛 `TypeError`，`super.tag = v` 写的是接收者。
class A {
  m() { return typeof super.toString; }
  n() { return super.hasOwnProperty === Object.prototype.hasOwnProperty; }
  constructor() { (this as any).t = typeof super.valueOf; }
}
const a = new A();
console.log(a.m(), a.n(), (a as any).t);

class B {
  static s() { return typeof super.apply; }
  static get g() { return typeof super.call; }
}
console.log(B.s(), B.g);

class C { m() { return super.m(); } }
try { new C().m(); console.log("no-throw"); }
catch (e: any) { console.log("call:", e.constructor.name); }

class D { set_(v: number) { super.tag = v; return (this as any).tag; } }
const d = new D();
console.log("write:", d.set_(5), (d as any).tag);

class E { toString() { return "E"; } m() { return typeof super.toString; } }
console.log("shadow:", new E().m(), new E().toString());
