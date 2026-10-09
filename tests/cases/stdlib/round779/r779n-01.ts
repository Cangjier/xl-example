// xl:title 切分 / 替换 / 填充的边角
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

t("01 padStart padString", () => "5".padStart(4, "ab"));
t("02 padStart truncated pad", () => "5".padStart(4, "abc"));
t("03 padStart no change", () => "abc".padStart(2));
t("04 replace one occurrence count", () => "aaa".replace("a", "b"));
t("05 split trailing empty", () => "a,".split(",").length);
t("06 split no match", () => "ab".split(",").length);
t("07 split empty sep", () => "".split("").length);
t("08 slice start beyond", () => JSON.stringify("abc".slice(5)));
t("09 substring negative", () => "abcdef".substring(-1, 3));
t("10 substr start beyond", () => JSON.stringify("abc".substr(5)));
t("11 indexOf empty", () => "abc".indexOf(""));
t("12 includes empty", () => "abc".includes(""));
t("13 startsWith empty", () => "abc".startsWith(""));
t("14 repeat fractional", () => { try { return "a".repeat(1.5); } catch (e: any) { return e.constructor.name; } });
t("15 trim unicode space", () => JSON.stringify("\u00a0x\u00a0".trim()));
t("16 trim tab newline", () => JSON.stringify("\t\nx\r\n".trim()));
t("17 concat numbers", () => "a".concat(1 as any, true as any));
t("18 charAt vs index", () => "abc".charAt(1) + ":" + "abc"[1]);
