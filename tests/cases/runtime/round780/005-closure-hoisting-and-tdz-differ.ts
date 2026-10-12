// xl:title 闭包 / 提升 / TDZ 的边角
// xl:round 780
// xl:judge stdout
// xl:want differ
// xl:why 两行是**旧账的新排版**（各一条已登记的根）：① `typeof` 打在**还压在 TDZ 里**的 `let` 上，Node 抛 `ReferenceError`、本仓给 `"undefined"`（`runtime/values/p748a-a01`，第 748 轮登的：`NameIsUnreachable` 不分「找不到」与「还没初始化」）；② **块里的函数声明在声明之前调用**，Node 给 `"g"`（提升到块顶）、本仓报 `TypeError`（`p748a-a03`，同一条）。其余八档全对（`var` 提升 / 循环里的 `let` 与 `var` 闭包 / IIFE 捕获 / 块作用域遮蔽 / `catch` 形参作用域 / 具名函数表达式的作用域），收那两条时不许连累它们。
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

t("01 var hoisting", () => { const f = () => { return typeof v; var v = 1; }; return f(); });
t("02 let TDZ typeof", () => { const f = () => { try { return typeof v; } catch (e: any) { return e.constructor.name; } let v = 1; }; return f(); });
t("03 function hoisting in block", () => { { return g(); function g() { return "g"; } } });
t("04 closure in loop let", () => { const fs: any[] = []; for (let i = 0; i < 3; i++) fs.push(() => i); return fs.map(f => f()).join(","); });
t("05 closure in loop var", () => { const fs: any[] = []; for (var i = 0; i < 3; i++) fs.push(() => i); return fs.map(f => f()).join(","); });
t("06 IIFE capture", () => { let x = 1; const f = (() => () => x)(); x = 2; return f(); });
t("07 block scope shadow", () => { let x = 1; { let x = 2; } return x; });
t("08 catch param scope", () => { let e = "outer"; try { throw "inner"; } catch (e) { } return e; });
t("09 named function expression scope", () => { const f = function self(n: number): number { return n <= 1 ? 1 : n * self(n - 1); }; return f(4) + ":" + typeof (f as any).self; });
