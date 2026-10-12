// xl:title `sort` / `splice` / 洞的深水区
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

t("01 sort comparator NaN", () => [3,1,2].sort(() => NaN).join(","));
t("02 sort undefined at end", () => [3, undefined, 1].sort().join(","));
t("03 sort sparse", () => { const a = [3,,1]; a.sort(); return a.length + ":" + a.join(",") ; });
t("04 sort string compare", () => ["b","a","C"].sort().join(","));
t("05 splice negative start", () => { const a = [1,2,3,4]; return a.splice(-2, 1).join(",") + "|" + a.join(","); });
t("06 splice insert only", () => { const a = [1,2]; a.splice(1, 0, "x"); return a.join(","); });
t("07 splice beyond", () => { const a = [1,2]; return a.splice(5, 3).length + "|" + a.length; });
t("08 flat Infinity", () => [1,[2,[3,[4]]]].flat(Infinity).join(","));
t("09 flat skips holes", () => [1,,2].flat().length);
t("10 fill negative", () => [1,2,3,4].fill(9, -2).join(","));
t("11 reduce sparse", () => { const a = [1,,3]; const seen: string[] = []; a.reduce((acc, v) => { seen.push(String(v)); return acc; }, 0); return seen.join(","); });
t("12 indexOf -0", () => [0].indexOf(-0) + ":" + [0].includes(-0));
t("13 includes fromIndex negative", () => [1,2,3].includes(3, -1));
t("14 lastIndexOf fromIndex", () => [1,2,1].lastIndexOf(1, 1));
t("15 join nested", () => [[1,2],[3]].join(";"));
t("16 toString of nested", () => String([[1,2],[3]]));
t("17 concat holes", () => [1,,3].concat([4]).length);
t("18 reverse sparse", () => { const a = [1,,3]; a.reverse(); return a.length + ":" + a.join(","); });
