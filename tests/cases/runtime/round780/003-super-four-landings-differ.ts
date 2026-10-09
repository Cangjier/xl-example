// xl:title `super` 的四个落点
// xl:round 780
// xl:judge stdout
// xl:want differ
// xl:why 四条**互不相同**的差额，判据在同一条用例里（收的时候要逐条对）：① 类字段里的箭头函数 `arrowSuper = () => super.m()` 在 Node 里走的是**宿主对象（`Derived.prototype`）的原型** ⇒ 给 `"base"`，本仓给 `"d+base"`（`super` 指到了自己那一层——**静默错值**，不是抛）；② 对象字面量里的 `super.m.call(this)`（原型由 `Object.setPrototypeOf` 后置）在 Node 里给 `"o+p"`，本仓抛 `TypeError`（对象字面量的方法没有宿主对象那一格）；③ `set(w) { super.v = w }` 在 Node 里**真的写进原型链**（给 `"x"`），本仓给 `"v0"`（**静默不写**）；④ 派生类写在**函数体**里时 `instanceof` 链（`class E extends Derived {}` 再 `new E() instanceof Base`）本仓报 `Error`——与 `r780b-04` 是**同一处根**（隐式构造器），这一条只是另一个出口。**分界由同一条用例的其余五档钉着**：方法里的 `super.m()` / 静态 `super.sm()` / 取值器 `super.g` / 显式 `constructor(){super()}` / `Symbol.hasInstance` 全对。
// xl:end
const S = (v: any): string => {
  try {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "function") return "fn:" + v.name;
    if (v === undefined) return "undefined";
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
    return String(v);
  } catch (e) { return "<unprintable>"; }
};
const t = (label: string, f: () => any) => {
  try { console.log(label + " = " + S(f())); }
  catch (e) { console.log(label + " ! " + ((e as any) && (e as any).constructor ? (e as any).constructor.name : "?")); }
};
const D = (label: string, obj: any, keys: string[]) => {
  for (const k of keys) {
    t(label + "." + k, () => {
      const f = obj[k];
      if (f === undefined) return "missing";
      return typeof f + ":" + f.name + "/" + f.length;
    });
  }
};

class Base { v: string = "v0"; m() { return "base"; } static sm() { return "sbase"; } get g() { return "gbase"; } }
class Derived extends Base {
  m() { return "d+" + super.m(); }
  static sm() { return "d+" + super.sm(); }
  get g() { return "d+" + super.g; }
  arrowSuper = () => super.m();
}
t("01 method super", () => new Derived().m());
t("02 static super", () => Derived.sm());
t("03 getter super", () => new Derived().g);
t("04 arrow super", () => (new Derived() as any).arrowSuper());
t("05 super in object", () => { const proto = { m() { return "p"; } }; const o: any = { m() { return "o+" + super.m.call(this); } }; Object.setPrototypeOf(o, proto); return o.m(); });
t("06 constructor super returns", () => { class E extends Base { constructor() { super(); } } return new E().m(); });
t("07 super property write", () => { class E extends Base { set(w: string) { super.v = w; } } const e: any = new E(); e.set("x"); return e.v; });
t("08 instanceof chain", () => { class E extends Derived { } return (new E()) instanceof Base; });
t("09 Symbol.hasInstance", () => { class E { static [Symbol.hasInstance](x: any) { return x === 5; } } return (5 as any) instanceof E; });
