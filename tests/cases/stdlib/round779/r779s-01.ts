// xl:title `Date.prototype` 那一族的方法名（守卫）
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

NL("01 getTime", Date.prototype.getTime);
NL("02 getUTCFullYear", Date.prototype.getUTCFullYear);
NL("03 toISOString", Date.prototype.toISOString);
NL("04 toJSON", Date.prototype.toJSON);
NL("05 valueOf", Date.prototype.valueOf);
NL("06 setTime", Date.prototype.setTime);
NL("07 setUTCHours", Date.prototype.setUTCHours);
NL("08 toString", Date.prototype.toString);
NL("09 toUTCString", Date.prototype.toUTCString);
NL("10 getTimezoneOffset", Date.prototype.getTimezoneOffset);
