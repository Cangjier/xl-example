// xl:title 字符串方法接 `RegExp` 对象那一半
// xl:round 779
// xl:judge stdout
// xl:want blocked
// xl:why 与 `r779j-01` 死在**同一句**（`new RegExp` ⇒ `RegExp` 全局名没登记），所以 `replace` / `replaceAll` / `split` / `match` / `matchAll` / `search` 接一个 **RegExp 对象**（不是字符串）时对不对，今天量不出来。这一条是给 `RegExp` 进来之后准备的判据：十二档里含替换串的 `$&` / `$1` / `$$`、回调的 `(match, …groups, offset, string)` 形状、`replaceAll` 对非全局正则**该抛 `TypeError`**、`split` 的捕获组切分。
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
t("01 replace", () => "abc".replace(R("b"), "X"));
t("02 replace global", () => "abab".replace(R("a", "g"), "X"));
t("03 replace dollar amp", () => "abc".replace(R("b"), "[$&]"));
t("04 replace groups", () => "a1".replace(R("(\\w)(\\d)"), "$2$1"));
t("05 replace fn", () => "abc".replace(R("b"), (m: string) => m.toUpperCase()));
t("06 replace fn groups", () => "a1".replace(R("(\\w)(\\d)"), (_m: string, a: string, b: string) => b + a));
t("07 replaceAll regexp global", () => "abab".replaceAll(R("a", "g"), "X"));
t("08 replaceAll non-global throws", () => { try { return "ab".replaceAll(R("a"), "X"); } catch (e: any) { return e.constructor.name; } });
t("09 split regexp", () => "a1b2c".split(R("\\d")).join("|"));
t("10 split capture", () => "a1b".split(R("(\\d)")).join("|"));
t("11 split limit", () => "a,b,c".split(R(","), 2).join("|"));
t("12 match global", () => (("a1b2".match(R("\\d", "g")) || []) as string[]).join("|"));
t("13 match non-global index", () => { const m: any = "a1b2".match(R("\\d")); return m[0] + ":" + m.index; });
t("14 matchAll length", () => [...("a1b2".matchAll(R("\\d", "g")))].length);
t("15 search", () => "abc".search(R("b")));
t("16 replace with dollar", () => "ab".replace(R("b"), "$$"));
