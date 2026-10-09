// xl:title `String` / `Number` / `Symbol` 那一族的 `name` / `length` 全量
// xl:round 780
// xl:judge stdout
// xl:want differ
// xl:why 这一份系统 dump 里只剩**三格**不同：`String.prototype.match` / `matchAll` / `search` **属性表里根本没有那一格**（本仓的 `RegExp` 整族还没做，`match` / `search` 要收正则对象、走 `Symbol.match` / `Symbol.search` 那条协议）——与 `stdlib/globals/058-missing-locale-and-regex-members`（`match` / `search`）、`stdlib/string/135-string-matchall-iterable`（`matchAll`）**同一条根**，这一条把它们放进「整族 dump」的判据里，收 `RegExp` 时**一处**就会把这三行一起点亮。同一份里其余 90 余格（含第 780 轮收掉的 `String.fromCharCode` / `fromCodePoint` / `raw`、`Symbol.for` / `keyFor`、`Number.prototype.toLocaleString` 的 `length`）全对。
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

D("String", String, ["fromCharCode", "fromCodePoint", "raw"]);
D("String.prototype", String.prototype, ["charAt", "charCodeAt", "codePointAt", "at", "indexOf",
  "lastIndexOf", "includes", "startsWith", "endsWith", "slice", "substring", "substr", "repeat",
  "padStart", "padEnd", "trim", "trimStart", "trimEnd", "toUpperCase", "toLowerCase",
  "toLocaleUpperCase", "toLocaleLowerCase", "normalize", "split", "replace", "replaceAll",
  "match", "matchAll", "search", "concat", "localeCompare", "toString", "valueOf", "isWellFormed",
  "toWellFormed", "anchor", "big", "blink", "bold", "fixed", "fontcolor", "fontsize", "italics",
  "link", "small", "strike", "sub", "sup"]);
D("Number", Number, ["isInteger", "isSafeInteger", "isNaN", "isFinite", "parseInt", "parseFloat"]);
D("Number.prototype", Number.prototype, ["toFixed", "toExponential", "toPrecision", "toString",
  "valueOf", "toLocaleString"]);
D("Boolean.prototype", Boolean.prototype, ["toString", "valueOf"]);
D("Symbol", Symbol, ["for", "keyFor", "iterator", "asyncIterator", "hasInstance", "toPrimitive",
  "toStringTag", "species", "isConcatSpreadable", "unscopables", "match", "matchAll", "replace",
  "search", "split"]);
