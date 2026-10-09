// xl:title 全局函数与 `Date` 的 `name` / `length`（第 779 轮收掉的那一族）
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
const NL = (label: string, f: any) => t(label, () => f.name + "/" + f.length);

NL("01 Date", Date);
NL("02 Date.UTC", Date.UTC);
NL("03 Date.parse", Date.parse);
NL("04 Date.now", Date.now);
NL("05 parseInt", parseInt);
NL("06 parseFloat", parseFloat);
NL("07 isNaN", isNaN);
NL("08 isFinite", isFinite);
NL("09 encodeURIComponent", encodeURIComponent);
NL("10 decodeURIComponent", decodeURIComponent);
NL("11 structuredClone", structuredClone);
NL("12 queueMicrotask", queueMicrotask);
