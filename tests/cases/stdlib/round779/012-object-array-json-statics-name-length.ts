// xl:title `Object` / `Array` / `JSON` 静态的 `name` / `length`
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

NL("01 Object.keys", Object.keys);
NL("02 Object.values", Object.values);
NL("03 Object.entries", Object.entries);
NL("04 Object.assign", Object.assign);
NL("05 Object.freeze", Object.freeze);
NL("06 Object.create", Object.create);
NL("07 Object.defineProperty", Object.defineProperty);
NL("08 Object.getOwnPropertyNames", Object.getOwnPropertyNames);
NL("09 Object.getOwnPropertyDescriptor", Object.getOwnPropertyDescriptor);
NL("10 Object.fromEntries", Object.fromEntries);
NL("11 Array.from", Array.from);
NL("12 Array.of", Array.of);
NL("13 Array.isArray", Array.isArray);
NL("14 JSON.parse", JSON.parse);
NL("15 JSON.stringify", JSON.stringify);
NL("16 Math.max", Math.max);
NL("17 Math.min", Math.min);
NL("18 Math.hypot", Math.hypot);
NL("19 Math.pow", Math.pow);
NL("20 Math.round", Math.round);
