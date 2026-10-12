// xl:title `Object` / `Function` / `Symbol` 原型上的名字（守卫）
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

NL("01 Object.prototype.toString", Object.prototype.toString);
NL("02 Object.prototype.hasOwnProperty", Object.prototype.hasOwnProperty);
NL("03 Object.prototype.valueOf", Object.prototype.valueOf);
NL("04 Function.prototype.call", Function.prototype.call);
NL("05 Function.prototype.apply", Function.prototype.apply);
NL("06 Function.prototype.bind", Function.prototype.bind);
NL("07 Function.prototype.toString", Function.prototype.toString);
NL("08 Symbol.prototype.toString", Symbol.prototype.toString);
NL("09 Symbol.prototype.valueOf", Symbol.prototype.valueOf);
NL("10 Number.prototype.toFixed", Number.prototype.toFixed);
