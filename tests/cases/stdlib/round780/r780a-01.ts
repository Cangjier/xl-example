// xl:title `Object` / `Array` 那一族的 `name` / `length` 全量（守卫）
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

D("Object", Object, ["keys", "values", "entries", "assign", "freeze", "seal", "preventExtensions",
  "isFrozen", "isSealed", "isExtensible", "defineProperty", "defineProperties", "create",
  "getOwnPropertyDescriptor", "getOwnPropertyDescriptors", "getOwnPropertyNames",
  "getOwnPropertySymbols", "getPrototypeOf", "setPrototypeOf", "fromEntries", "is", "hasOwn", "groupBy"]);
D("Object.prototype", Object.prototype, ["toString", "valueOf", "hasOwnProperty", "isPrototypeOf",
  "propertyIsEnumerable", "toLocaleString", "__proto__", "__lookupGetter__", "__lookupSetter__",
  "__defineGetter__", "__defineSetter__"]);
D("Array", Array, ["from", "of", "isArray", "fromAsync"]);
D("Array.prototype", Array.prototype, ["push", "pop", "shift", "unshift", "slice", "splice", "concat",
  "join", "reverse", "sort", "indexOf", "lastIndexOf", "includes", "find", "findIndex", "findLast",
  "findLastIndex", "filter", "map", "forEach", "reduce", "reduceRight", "some", "every", "flat",
  "flatMap", "fill", "copyWithin", "at", "keys", "values", "entries", "toString", "toLocaleString",
  "toReversed", "toSorted", "toSpliced", "with", "group", "groupToMap"]);
