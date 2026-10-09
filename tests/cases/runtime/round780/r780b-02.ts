// xl:title 私有成员与访问器的边界
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
  #x = 1;
  #m() { return "m"; }
  static #s = 2;
  get x() { return this.#x; }
  set x(v: number) { this.#x = v; }
  static get s() { return A.#s; }
  run() { return this.#m(); }
  has(o: any) { return #x in o; }
}
t("01 getter", () => new A().x);
t("02 setter", () => { const a = new A(); a.x = 9; return a.x; });
t("03 private method", () => new A().run());
t("04 static private", () => A.s);
t("05 brand", () => new A().has(new A()) + ":" + new A().has({}));
t("06 private in keys", () => Object.keys(new A()).length);
t("07 private subclass access", () => { class B extends A { tryIt() { return (this as any).x; } } return new B().tryIt(); });
t("08 delete private", () => { const a: any = new A(); return delete a.x; });
t("09 private name clash across classes", () => {
  class B { #v = "b"; get v() { return this.#v; } }
  class C { #v = "c"; get v() { return this.#v; } }
  return new B().v + new C().v;
});
t("10 accessor pair on prototype", () => {
  const d: any = Object.getOwnPropertyDescriptor(A.prototype, "x");
  return typeof d.get + ":" + typeof d.set + ":" + d.enumerable;
});
