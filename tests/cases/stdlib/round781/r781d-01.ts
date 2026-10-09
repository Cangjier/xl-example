// xl:title `WeakMap` / `WeakSet` 的形状与边界
// xl:round 781
// xl:judge stdout
// xl:want differ
// xl:why 十二档里只剩一行不同：`typeof WeakRef` 在 Node 里是 `"function"`、本仓给 `"undefined"`——第 736 轮登记的「`Proxy` / `WeakRef` / `FinalizationRegistry` 三个全局名都还没登记」那一族，这一条把它与 `WeakMap` / `WeakSet` 自己的形状钉在同一份语料里（`set` / `get` / `has` / `delete` / 原始值键抛 `TypeError` / 取不到给 `undefined` / 没有 `size` / 标签 / `instanceof` / 从可迭代物构造，十一档全对）。
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

t("01 weakmap set get", () => { const k = {}; const m = new WeakMap(); m.set(k, 1); return m.get(k); });
t("02 weakmap has delete", () => { const k = {}; const m = new WeakMap([[k, 1]]); return m.has(k) + ":" + m.delete(k) + ":" + m.has(k); });
t("03 weakmap primitive key throws", () => { try { (new WeakMap() as any).set(1, 2); return "no"; } catch (e: any) { return e.constructor.name; } });
t("04 weakmap get undefined", () => { const m = new WeakMap(); return String(m.get({})); });
t("05 weakmap no size", () => typeof (new WeakMap() as any).size);
t("06 weakset add has", () => { const k = {}; const s = new WeakSet(); s.add(k); return s.has(k); });
t("07 weakset primitive throws", () => { try { (new WeakSet() as any).add(1); return "no"; } catch (e: any) { return e.constructor.name; } });
t("08 weakmap tag", () => Object.prototype.toString.call(new WeakMap()));
t("09 weakset tag", () => Object.prototype.toString.call(new WeakSet()));
t("10 weakmap instanceof", () => (new WeakMap()) instanceof WeakMap);
t("11 weakmap ctor from iterable", () => { const k = {}; const m = new WeakMap([[k, 5]] as any); return m.get(k); });
t("12 weakref typeof", () => typeof (globalThis as any).WeakRef);
