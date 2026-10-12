// xl:title 字符串的比较 / 转换 / 数值化
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

t("01 string compare", () => ("a" < "b") + ":" + ("10" < "9"));
t("02 equality number string", () => ("1" as any) == (1 as any));
t("03 number of string", () => Number("") + ":" + Number(" ") + ":" + Number("\n"));
t("04 plus string number", () => "1" + 2);
t("05 unary plus", () => +"3");
t("06 parseInt of number", () => parseInt(15.9 as any));
t("07 parseFloat of number", () => parseFloat(1.5 as any));
t("08 number to fixed string", () => String(1.0));
t("09 boolean to string", () => String(true) + ":" + true.toString());
t("10 template nested", () => `a${1 + 1}b`);
t("11 template multiline", () => `a
b`.length);
t("12 text join", () => ["a","b"].join("-"));
