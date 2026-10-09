// xl:title `Promise` / `Error` / 生成器 / `Date` 那一族的 `name` / `length` 全量（守卫）
// xl:round 780
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
const D = (label: string, obj: any, keys: string[]) => {
  for (const k of keys) {
    t(label + "." + k, () => {
      const f = obj[k];
      if (f === undefined) return "missing";
      return typeof f + ":" + f.name + "/" + f.length;
    });
  }
};

D("Promise", Promise, ["resolve", "reject", "all", "allSettled", "any", "race", "withResolvers",
  "try"]);
D("Promise.prototype", Promise.prototype, ["then", "catch", "finally"]);
D("Error", Error, ["isError", "captureStackTrace"]);
D("Error.prototype", Error.prototype, ["toString"]);
D("AggregateError.prototype", AggregateError.prototype, ["toString"]);
D("Date", Date, ["now", "parse", "UTC"]);
D("Date.prototype", Date.prototype, ["getTime", "valueOf", "toISOString", "toJSON", "toString",
  "toUTCString", "setTime", "getTimezoneOffset"]);
t("generator next", () => { function* g() { } const it: any = g(); return it.next.name + "/" + it.next.length + ":" + it.return.name + ":" + it.throw.name; });
