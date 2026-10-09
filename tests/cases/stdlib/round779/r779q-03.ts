// xl:title 构造器与原型方法的 `name` / `length`
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

NL("01 Object", Object);
NL("02 Array", Array);
NL("03 String", String);
NL("04 Number", Number);
NL("05 Boolean", Boolean);
NL("06 Error", Error);
NL("07 TypeError", TypeError);
NL("08 Map", Map);
NL("09 Set", Set);
NL("10 Map.prototype.get", Map.prototype.get);
NL("11 Map.prototype.set", Map.prototype.set);
NL("12 Map.prototype.forEach", Map.prototype.forEach);
NL("13 Array.prototype.map", Array.prototype.map);
NL("14 Array.prototype.reduce", Array.prototype.reduce);
NL("15 Array.prototype.slice", Array.prototype.slice);
NL("16 String.prototype.slice", String.prototype.slice);
NL("17 String.prototype.replace", String.prototype.replace);
NL("18 Object.prototype.toString", Object.prototype.toString);
NL("19 Function.prototype.call", Function.prototype.call);
NL("20 Function.prototype.bind", Function.prototype.bind);
