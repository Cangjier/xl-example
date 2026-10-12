// xl:title `RegExp` 构造器那一半：全局名没登记
// xl:round 779
// xl:judge stdout
// xl:want blocked
// xl:why `RegExp` 这个全局名**根本没登记**——`new RegExp("ab+c")` 报 `name is not a local or a capture: RegExp`（**整份文件进不来**）。它与正则字面量（`unimplemented: expression RegularExpressionLiteral`）是**同一个缺失的两半**：`RegExp` 整族待做（旧账在 `stdlib/globals/060-regexp-lite` / `006-regexp-literal-basic` 那一族）。这一条把**构造器那一半**单独钉住，顺带把 `exec` / `lastIndex` / `flags` / `sticky` / 命名组十二档写成进来之后的判据。
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

const R = (p: string, f?: string) => new RegExp(p, f);
t("01 test", () => R("ab+c").test("xabbc"));
t("02 exec index", () => { const m: any = R("b+").exec("abbb"); return m[0] + ":" + m.index + ":" + m.input.length; });
t("03 exec null", () => String(R("z").exec("a")));
t("04 global lastIndex", () => { const r = R("a", "g"); r.exec("aa"); return r.lastIndex; });
t("05 global exhausted resets", () => { const r = R("a", "g"); r.exec("a"); const m = r.exec("a"); return String(m) + ":" + r.lastIndex; });
t("06 flags", () => R("a", "gi").flags + ":" + R("a", "gi").global + ":" + R("a", "gi").ignoreCase);
t("07 source", () => R("a/b").source);
t("08 sticky", () => { const r = R("a", "y"); r.lastIndex = 1; const ok = r.test("ba"); return ok + ":" + r.lastIndex; });
t("09 named groups", () => { const m: any = R("(?<y>\\d+)").exec("x42"); return m.groups.y; });
t("10 toString", () => String(R("a+", "g")));
t("11 from regexp", () => R("a", "g").source);
t("12 non-string arg", () => { try { return new RegExp(5 as any).source; } catch (e: any) { return e.constructor.name; } });
t("13 exec without match keeps lastIndex 0", () => { const r = R("z", "g"); r.exec("abc"); return r.lastIndex; });
