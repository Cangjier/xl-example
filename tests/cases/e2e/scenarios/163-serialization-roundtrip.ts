// xl:title 自定义序列化：类型标签、循环引用、还原
// xl:round 371
// xl:judge stdout
// xl:end
type Tagged = { __type: string; value: unknown };
function encode(value: unknown, seen = new Map<unknown, string>()): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) return { __type: "number", value: String(value) } as Tagged;
    if (value === undefined) return { __type: "undefined" } as Tagged;
    return value;
  }
  const existing = seen.get(value);
  if (existing !== undefined) return { __type: "ref", value: existing } as Tagged;
  const id = "#" + (seen.size + 1);
  seen.set(value, id);
  if (Array.isArray(value)) return { __type: "array", id, value: value.map((v) => encode(v, seen)) };
  if (value instanceof Map) return { __type: "map", id, value: [...value.entries()].map(([k, v]) => [encode(k, seen), encode(v, seen)]) };
  if (value instanceof Set) return { __type: "set", id, value: [...value].map((v) => encode(v, seen)) };
  if (value instanceof Date) return { __type: "date", id, value: value.getTime() };
  const props: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>)) props[key] = encode((value as Record<string, unknown>)[key], seen);
  return { __type: "object", id, value: props };
}
function decode(node: unknown, refs = new Map<string, unknown>()): unknown {
  if (node === null || typeof node !== "object") return node;
  const t = node as Tagged & { id?: string };
  switch (t.__type) {
    case "undefined": return undefined;
    case "number": return t.value === "NaN" ? NaN : t.value === "Infinity" ? Infinity : -Infinity;
    case "ref": return refs.get(t.value as string);
    case "date": { const d = new Date(t.value as number); refs.set(t.id as string, d); return d; }
    case "array": { const arr: unknown[] = []; refs.set(t.id as string, arr); for (const v of t.value as unknown[]) arr.push(decode(v, refs)); return arr; }
    case "map": { const m = new Map(); refs.set(t.id as string, m); for (const [k, v] of t.value as [unknown, unknown][]) m.set(decode(k, refs), decode(v, refs)); return m; }
    case "set": { const s = new Set(); refs.set(t.id as string, s); for (const v of t.value as unknown[]) s.add(decode(v, refs)); return s; }
    default: {
      const o: Record<string, unknown> = {};
      refs.set(t.id as string, o);
      for (const key of Object.keys(t.value as Record<string, unknown>)) o[key] = decode((t.value as Record<string, unknown>)[key], refs);
      return o;
    }
  }
}
const shared = { tag: "shared" };
const source: any = {
  n: NaN,
  inf: Infinity,
  missing: undefined,
  arr: [1, shared, shared],
  map: new Map<string, unknown>([["k", shared]]),
  set: new Set([1, 2]),
  date: new Date(0),
  self: null,
};
source.self = source;
const encoded = encode(source);
const text = JSON.stringify(encoded);
console.log(text.length);
const back = decode(JSON.parse(text)) as any;
console.log(Number.isNaN(back.n), back.inf === Infinity, back.missing === undefined);
console.log(back.arr[1] === back.arr[2], back.map.get("k") === back.arr[1], back.self === back);
console.log(back.date.getTime(), back.set.size, JSON.stringify(back.arr[0]));
