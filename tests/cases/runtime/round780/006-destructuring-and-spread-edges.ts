// xl:title 解构 / 展开 / 默认值的边角
// xl:round 780
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
const D = (label: string, obj: any, keys: string[]) => {
  for (const k of keys) {
    t(label + "." + k, () => {
      const f = obj[k];
      if (f === undefined) return "missing";
      return typeof f + ":" + f.name + "/" + f.length;
    });
  }
};

t("01 rest object", () => { const { a, ...rest } = { a: 1, b: 2, c: 3 } as any; return a + ":" + JSON.stringify(rest); });
t("02 rest array", () => { const [a, ...rest] = [1, 2, 3]; return a + ":" + rest.join(","); });
t("03 nested default", () => { const { a: { b = 5 } = {} } = {} as any; return b; });
t("04 default laziness", () => { let called = false; const f = (v: any = (called = true)) => called; return f(1) + ":" + called; });
t("05 spread call", () => { const xs = [1, 2]; return Math.max(...xs, 3); });
t("06 spread object getter order", () => { const seen: string[] = []; const src: any = { get a() { seen.push("a"); return 1; }, get b() { seen.push("b"); return 2; } }; const out: any = { ...src }; return seen.join(",") + ":" + out.a + out.b; });
t("07 computed key order", () => { const k = "x"; const o: any = { [k]: 1, y: 2 }; return Object.keys(o).join(","); });
t("08 swap destructure", () => { let a = 1, b = 2; [a, b] = [b, a]; return a + ":" + b; });
t("09 destructure string", () => { const [a, b] = "hi" as any; return a + b; });
t("10 object rest skips symbols", () => { const s = Symbol("s"); const o: any = { a: 1, [s]: 2 }; const { ...rest } = o; return Object.keys(rest).length + ":" + (rest as any)[s]; });
