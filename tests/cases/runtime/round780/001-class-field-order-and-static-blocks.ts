// xl:title 类的字段初始化次序与 `static` 块
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

class A {
  static log: string[] = [];
  static s1 = (A.log.push("s1"), 1);
  static { A.log.push("block"); }
  static s2 = (A.log.push("s2"), 2);
  f1 = (A.log.push("f1"), 1);
  constructor() { A.log.push("ctor"); }
}
t("01 static order", () => { return A.log.join(","); });
t("02 instance order", () => { const a = new A(); return A.log.join(","); });
t("03 field values", () => { const a = new A(); return (a as any).f1 + ":" + A.s1; });
t("04 class expr static block", () => { const log: string[] = []; const C = class { static x = (log.push("x"), 1); static { log.push("b"); } }; return log.join(",") + ":" + C.x; });
t("05 derived field after super", () => {
  const log: string[] = [];
  class B { constructor() { log.push("B"); } }
  class C extends B { f = (log.push("f"), 1); constructor() { super(); log.push("after-super"); } }
  new C();
  return log.join(",");
});
t("06 static inheritance of field", () => { class P { static v = 1; } class Q extends P { } return (Q as any).v; });
t("07 static block this", () => { let got = ""; class C { static { got = typeof this; } } return got; });
t("08 private static block", () => { class C { static #n = 5; static get n() { return C.#n; } } return C.n; });
