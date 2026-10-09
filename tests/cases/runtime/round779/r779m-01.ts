// xl:title 属性描述符 / 枚举 / 原型的落点
// xl:round 779
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

t("01 defineProperty defaults", () => { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); const d: any = Object.getOwnPropertyDescriptor(o, "a"); return [d.writable, d.enumerable, d.configurable].join(","); });
t("02 defineProperty redefine nonconfigurable throws", () => { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); try { Object.defineProperty(o, "a", { value: 2 }); return "no"; } catch (e: any) { return e.constructor.name; } });
t("03 same value nonconfigurable ok", () => { const o: any = {}; Object.defineProperty(o, "a", { value: 1 }); Object.defineProperty(o, "a", { value: 1 }); return o.a; });
t("04 getOwnPropertyDescriptors", () => Object.keys(Object.getOwnPropertyDescriptors({ a: 1 })).join(","));
t("05 non-enumerable hidden", () => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, enumerable: false }); return Object.keys(o).length + ":" + Object.getOwnPropertyNames(o).join(","); });
t("06 spread copies enumerable only", () => { const o: any = {}; Object.defineProperty(o, "a", { value: 1, enumerable: false }); o.b = 2; return JSON.stringify({ ...o }); });
t("07 spread invokes getters", () => { let n = 0; const o: any = { get g() { n++; return 1; } }; const c: any = { ...o }; return n + ":" + c.g + ":" + n; });
t("08 proto chain lookup", () => { const p = { m() { return 1; } }; const o = Object.create(p); return o.m() + ":" + Object.keys(o).length; });
t("09 assign getters", () => { const src: any = { get g() { return 7; } }; const dst: any = {}; Object.assign(dst, src); const d: any = Object.getOwnPropertyDescriptor(dst, "g"); return dst.g + ":" + (d.get === undefined); });
t("10 freeze then write sloppy", () => { const o: any = Object.freeze({ a: 1 }); o.a = 2; return o.a; });
t("11 freeze then add", () => { const o: any = Object.freeze({ a: 1 }); o.b = 2; return Object.keys(o).join(","); });
t("12 proto null JSON", () => JSON.stringify(Object.create(null) as any));
t("13 getOwnPropertySymbols", () => { const s = Symbol("s"); const o: any = { [s]: 1, a: 2 }; return Object.getOwnPropertySymbols(o).length + ":" + Object.keys(o).length; });
t("14 entries of array", () => Object.entries(["a","b"]).map(e => e.join(":")).join("|"));
