// xl:title `structuredClone` 的边界：不可克隆的值抛的是 `DOMException`
// xl:round 781
// xl:judge stdout
// xl:want differ
// xl:why **不可克隆的值**（函数、符号）在 Node 里抛的是 `DOMException`（名字 `DataCloneError`），本仓抛 `TypeError`——本仓没有 `DOMException` 那一族。十五档里其余十三档全对（原始值 / 对象 / 嵌套 / 数组 / 新引用 / `Date` / `Map` / `Set` / 共享引用保持同一性 / 环 / `undefined` / `null`），收的时候不许连累它们。**为什么不顺手收**：抛一个 `DOMException` 要先有那一族（现在连全局名都没有），而 `structuredClone` 自己那十五档是对的——先如实登记。
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

t("01 number", () => structuredClone(5));
t("02 string", () => structuredClone("a"));
t("03 object", () => JSON.stringify(structuredClone({ a: 1 })));
t("04 nested object", () => JSON.stringify(structuredClone({ a: { b: [1, 2] } })));
t("05 array", () => structuredClone([1, [2]]).length);
t("06 not same ref", () => { const o = { a: 1 }; return structuredClone(o) === o; });
t("07 date", () => structuredClone(new Date(0)).getTime());
t("08 map", () => structuredClone(new Map([[1, 2]])).get(1));
t("09 set", () => structuredClone(new Set([1, 2])).size);
t("10 shared ref", () => { const inner = { x: 1 }; const out: any = structuredClone({ a: inner, b: inner }); return out.a === out.b; });
t("11 cycle", () => { const o: any = { }; o.self = o; const out: any = structuredClone(o); return out.self === out; });
t("12 function throws", () => { try { structuredClone({ f: () => 1 } as any); return "no"; } catch (e: any) { return e.constructor.name; } });
t("13 undefined", () => String(structuredClone(undefined)));
t("14 null", () => String(structuredClone(null)));
t("15 symbol throws", () => { try { structuredClone(Symbol("s") as any); return "no"; } catch (e: any) { return e.constructor.name; } });
