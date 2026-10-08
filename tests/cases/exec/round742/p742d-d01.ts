// xl:title 没有 `extends` 的类里，`super` 的家对象是当前类自己（第 742 轮收掉的那一格）
// xl:round 742
// xl:judge stdout
// xl:end
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
