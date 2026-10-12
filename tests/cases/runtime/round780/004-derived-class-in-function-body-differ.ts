// xl:title 函数体里的派生类：隐式构造器那一格
// xl:round 780
// xl:judge stdout
// xl:want differ
// xl:why **派生类只要没写构造函数、又长在函数体里，`new` 它就报 `new_closure needs an environment or undefined`**（八档里六档：箭头体 / 块 / 方法体 / 函数声明 / 带字段的 / 不带基类的对照组除外）。根在降级层那一句**合成**的默认构造函数（`LowerClass` 第 203 轮：`constructor(...args) { super(...args) }` 那棵树是**现造的普通对象**，没有 `pos` / `parent` 这些挂在真实节点上的东西）——顶层那一格是好的（同一个形状写在模块顶层给 `"base"`），差别只剩「合成出来的构造函数要不要捕获外层环境」。它与第 778 轮登记的 `runtime/round778b/r778m-01`（函数体里 `class … extends` **内建** ⇒ `heap object is not an environment`）**是同一处根**，这一条把分界缩到最小：**基类是不是内建无关**，缺的是隐式构造器那一格。**为什么不顺手收**：合成节点要长出「与真实节点同形」的那几格（或者改成从语法树里借一个真节点），那是一次结构性改动，先如实登记。
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

class Base { m() { return "base"; } }
t("01 implicit ctor in arrow body", () => { const f = () => { class E extends Base { } return new E().m(); }; return f(); });
t("02 explicit ctor in arrow body", () => { const f = () => { class E extends Base { constructor() { super(); } } return new E().m(); }; return f(); });
t("03 implicit ctor with field in arrow body", () => { const f = () => { class E extends Base { x = 1; } return new E().m(); }; return f(); });
t("04 implicit ctor in block", () => { { class E extends Base { } return new E().m(); } });
t("05 implicit ctor at top level", () => { class E extends Base { } return new E().m(); });
t("06 implicit ctor in method body", () => { class Holder { make() { class E extends Base { } return new E().m(); } } return new Holder().make(); });
t("07 implicit ctor no base", () => { const f = () => { class E { m() { return "e"; } } return new E().m(); }; return f(); });
t("08 implicit ctor in function decl", () => { function make() { class E extends Base { } return new E().m(); } return make(); });
