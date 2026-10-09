// xl:title `Map` / `Set` / `WeakMap` / `WeakSet` 那一族的 `name` / `length` 全量（守卫）
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

D("Map", Map, ["groupBy"]);
D("Map.prototype", Map.prototype, ["get", "set", "has", "delete", "clear", "forEach", "keys",
  "values", "entries"]);
D("Set.prototype", Set.prototype, ["add", "has", "delete", "clear", "forEach", "keys", "values",
  "entries"]);
D("WeakMap.prototype", WeakMap.prototype, ["get", "set", "has", "delete"]);
D("WeakSet.prototype", WeakSet.prototype, ["add", "has", "delete"]);
