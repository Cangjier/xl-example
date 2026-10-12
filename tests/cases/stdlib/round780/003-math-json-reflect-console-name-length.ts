// xl:title `Math` / `JSON` / `Reflect` / `console` 那一族的 `name` / `length` 全量（守卫）
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

D("Math", Math, ["floor", "ceil", "round", "trunc", "abs", "sign", "sqrt", "cbrt", "pow", "exp",
  "log", "log2", "log10", "log1p", "expm1", "hypot", "imul", "clz32", "fround", "f16round",
  "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh", "asinh", "acosh",
  "atanh", "max", "min", "random"]);
D("JSON", JSON, ["parse", "stringify"]);
D("Reflect", Reflect, ["apply", "construct", "defineProperty", "deleteProperty", "get",
  "getOwnPropertyDescriptor", "getPrototypeOf", "has", "isExtensible", "ownKeys",
  "preventExtensions", "set", "setPrototypeOf"]);
D("console", console, ["log", "error", "warn", "info", "debug", "dir", "table", "count",
  "countReset", "assert", "group", "groupEnd", "groupCollapsed"]);
