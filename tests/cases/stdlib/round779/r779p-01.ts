// xl:title `Math` 舍入的负数、`NaN` 与 `Infinity`
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

t("01 round -1.5", () => Math.round(-1.5));
t("02 round -2.5", () => Math.round(-2.5));
t("03 round 1.5", () => Math.round(1.5));
t("04 round NaN", () => String(Math.round(NaN)));
t("05 round Infinity", () => Math.round(Infinity));
t("06 floor negative zero", () => String(Math.floor(-0)));
t("07 ceil of -0.1", () => String(Math.ceil(-0.1)));
t("08 hypot NaN", () => String(Math.hypot(3, NaN)));
t("09 hypot empty", () => Math.hypot());
t("10 max NaN", () => String(Math.max(1, NaN)));
t("11 min of empty", () => String(Math.min()));
t("12 pow 1 Infinity", () => Math.pow(1, Infinity));
t("13 clz32 large", () => Math.clz32(0x80000000));
t("14 atan2 signs", () => Math.atan2(0, -0) + ":" + Math.atan2(-0, -0));
t("15 sqrt negative", () => String(Math.sqrt(-1)));
t("16 log of 0", () => String(Math.log(0)));
t("17 PI render", () => Math.PI);
t("18 abs of string", () => Math.abs("-3" as any));
