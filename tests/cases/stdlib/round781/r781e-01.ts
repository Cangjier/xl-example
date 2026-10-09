// xl:title 新族方法：`toSorted` / `with` / `toSpliced` / `isWellFormed`
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

t("01 toSorted no mutate", () => { const a = [3, 1, 2]; const b = a.toSorted(); return a.join(",") + "|" + b.join(","); });
t("02 toReversed no mutate", () => { const a = [1, 2]; const b = a.toReversed(); return a.join(",") + "|" + b.join(","); });
t("03 toSpliced", () => { const a = [1, 2, 3]; const b = a.toSpliced(1, 1, 9); return a.join(",") + "|" + b.join(","); });
t("04 with negative", () => [1, 2, 3].with(-1, 9).join(","));
t("05 with out of range", () => { try { return [1].with(5, 9).join(","); } catch (e: any) { return e.constructor.name; } });
t("06 isWellFormed", () => "ab".isWellFormed() + ":" + "\uD800".isWellFormed());
t("07 toWellFormed", () => "\uD800a".toWellFormed().length + ":" + JSON.stringify("\uD800a".toWellFormed()));
t("08 array at", () => [1, 2, 3].at(-2));
t("09 findLast", () => [1, 2, 3].findLast((v) => v < 3));
t("10 toSorted comparator", () => [3, 1, 2].toSorted((a, b) => b - a).join(","));
t("11 splice consistency", () => { const a = [1, 2, 3]; a.splice(0, 1); return a.join(","); });
t("12 with string index", () => [1, 2].with("1" as any, 9).join(","));
