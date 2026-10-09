// xl:title 另外四个函数的 `name` / `length`（守卫）
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

NL("01 Array.fromAsync", Array.fromAsync);
NL("02 Map.groupBy", Map.groupBy);
NL("03 Date.prototype.toISOString", Date.prototype.toISOString);
NL("04 Object.getOwnPropertyDescriptor", Object.getOwnPropertyDescriptor);
