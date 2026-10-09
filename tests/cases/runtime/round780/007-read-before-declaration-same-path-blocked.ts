// xl:title 同一条路径上先读后声明的名字：降级期 TDZ 误判
// xl:round 780
// xl:judge stdout
// xl:want blocked
// xl:why **整份文件进不来**：`t("01", () => { try { new C780() } catch (e) {} class C780 { } })` 报 `name used before its declaration: C780`——降级期那一趟预扫只看「这个名字在**这一层**声明过没有」，不看「这一条路径先走了谁」；而这在 JS 里是**运行期** `ReferenceError`（`try` 自己接得住，脚本照跑）。与第 778 轮登记的 `runtime/round778b/r778l-01`（`switch` 的 `case` 里 `let` 声明、前一个 `case` 先读）**是同一处根**，这一条是最小形状：一个 `try`、一个类声明、四档（`try` 里先读类 / `if (false)` 里先读类 / 先调后面的函数声明 / 先读后面的 `let`——后两档在 JS 里**是好的**，正是它们把「误判」与「真的用了未初始化」分开）。
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

t("01 class declared after use in try", () => { try { new C780(); return "no-throw"; } catch (e: any) { return e.constructor.name; } class C780 { } });
t("02 class declared after use in if false", () => { if (false) { new C781(); } class C781 { } return "ok"; });
t("03 function declared after use", () => { try { return f780(); } catch (e: any) { return e.constructor.name; } function f780() { return "f"; } });
t("04 let declared after use in try", () => { try { return String(v780); } catch (e: any) { return e.constructor.name; } let v780 = 1; });
