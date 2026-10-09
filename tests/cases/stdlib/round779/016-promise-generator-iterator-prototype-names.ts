// xl:title `Promise` / 生成器 / 迭代器原型的名字（守卫）
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

NL("01 then", Promise.prototype.then);
NL("02 catch", Promise.prototype.catch);
NL("03 finally", Promise.prototype.finally);
NL("04 Symbol.iterator on Array", (Array.prototype as any)[Symbol.iterator]);
NL("05 Array.prototype.entries", Array.prototype.entries);
NL("06 Array.prototype.keys", Array.prototype.keys);
NL("07 Array.prototype.values", Array.prototype.values);
t("08 generator next name", () => { function* g() { } const it: any = g(); return it.next.name + "/" + it.next.length; });
t("09 generator return name", () => { function* g() { } const it: any = g(); return it.return.name; });
