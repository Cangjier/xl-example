// xl:title 函数与 `this` 的绑定形状
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

t("01 method shorthand this", () => { const o: any = { n: 1, m() { return this.n; } }; return o.m(); });
t("02 detached this", () => { const o: any = { n: 1, m() { return this === undefined ? "u" : "o"; } }; const f = o.m; return f(); });
t("03 arrow this", () => { const o: any = { n: 2, m() { const f = () => this.n; return f(); } }; return o.m(); });
t("04 call apply", () => { const f = function (this: any, a: number, b: number) { return this.n + a + b; }; return f.call({ n: 1 }, 2, 3) + ":" + f.apply({ n: 1 }, [2, 3]); });
t("05 bind partial", () => { const f = function (this: any, a: number, b: number) { return this.n + a + b; }; return f.bind({ n: 1 }, 2)(3); });
t("06 arguments length", () => { const f = function () { return arguments.length + ":" + arguments[0]; }; return f(1, 2); });
t("07 arguments length only", () => { const f = function () { return arguments.length; }; return f(1, 2); });
t("08 default param order", () => { const f = (a: number, b = a + 1) => a + ":" + b; return f(1) + "|" + f(1, 5); });
t("09 rest param", () => { const f = (...xs: number[]) => xs.length + ":" + xs.join(""); return f(1, 2, 3); });
t("10 function name inference", () => { const f = () => 1; const o: any = { m: function () { } }; return f.name + ":" + o.m.name; });
t("11 new with return object", () => { const F: any = function (this: any) { this.a = 1; return { b: 2 }; }; const o = new F(); return o.b + ":" + (o.a === undefined); });
t("12 new with return primitive", () => { const F: any = function (this: any) { this.a = 1; return 5; }; return new F().a; });
t("13 iife this", () => (function (this: any) { return this === undefined ? "u" : typeof this; })());
t("14 getter in object literal", () => { const o: any = { get a() { return 1; }, set a(v: number) { this._v = v; } }; o.a = 5; return o.a + ":" + o._v; });
