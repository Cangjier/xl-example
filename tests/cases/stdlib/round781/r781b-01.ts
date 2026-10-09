// xl:title `Object.groupBy` / `Map.groupBy` 的落点（含符号键与对象键）
// xl:round 781
// xl:judge stdout
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

t("01 object groupBy keys", () => JSON.stringify(Object.groupBy([1, 2, 3, 4], (n: number) => n % 2 === 0 ? "even" : "odd")));
t("02 object groupBy callback args", () => { const seen: string[] = []; Object.groupBy(["a", "b"], (v: any, i: number) => { seen.push(v + ":" + i); return "k"; }); return seen.join(","); });
t("03 object groupBy proto", () => Object.getPrototypeOf(Object.groupBy([1], () => "k")) === null);
t("04 object groupBy key coercion", () => Object.keys(Object.groupBy([1], () => 1 as any)).join(","));
t("05 map groupBy type", () => Object.prototype.toString.call(Map.groupBy([1, 2], (n: number) => n % 2)));
t("06 map groupBy values", () => { const m: any = Map.groupBy([1, 2, 3], (n: number) => n % 2); return m.get(1).join(",") + "|" + m.get(0).join(","); });
t("07 map groupBy callback args", () => { const seen: string[] = []; Map.groupBy([7], (v: any, i: number) => { seen.push(v + ":" + i); return "k"; }); return seen.join(","); });
t("08 object groupBy empty", () => Object.keys(Object.groupBy([], () => "k")).length);
t("09 object groupBy symbol key", () => { const s = Symbol("s"); const o: any = Object.groupBy([1], () => s); return o[s].join(","); });
