// xl:title 对象深比较与差异报告
// xl:round 371
// xl:judge stdout
// xl:end
type Diff = { path: string; kind: "add" | "remove" | "change"; from?: unknown; to?: unknown };
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function diff(a: unknown, b: unknown, path = ""): Diff[] {
  if (a === b) return [];
  if (Array.isArray(a) && Array.isArray(b)) {
    const out: Diff[] = [];
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      const p = path + "[" + i + "]";
      if (i >= a.length) out.push({ path: p, kind: "add", to: b[i] });
      else if (i >= b.length) out.push({ path: p, kind: "remove", from: a[i] });
      else out.push(...diff(a[i], b[i], p));
    }
    return out;
  }
  if (isObj(a) && isObj(b)) {
    const out: Diff[] = [];
    for (const k of Object.keys(a)) {
      const p = path === "" ? k : path + "." + k;
      if (!(k in b)) out.push({ path: p, kind: "remove", from: a[k] });
      else out.push(...diff(a[k], b[k], p));
    }
    for (const k of Object.keys(b)) {
      if (!(k in a)) out.push({ path: path === "" ? k : path + "." + k, kind: "add", to: b[k] });
    }
    return out;
  }
  return [{ path, kind: "change", from: a, to: b }];
}
function deepEqual(a: unknown, b: unknown): boolean { return diff(a, b).length === 0; }
const before = { name: "app", version: 1, tags: ["a", "b"], nested: { x: 1, gone: true } };
const after = { name: "app", version: 2, tags: ["a", "c"], nested: { x: 1 }, extra: null };
for (const d of diff(before, after)) console.log(d.kind, d.path, JSON.stringify(d.from), JSON.stringify(d.to));
console.log(deepEqual(before, JSON.parse(JSON.stringify(before))), deepEqual(before, after), deepEqual([1, [2]], [1, [2]]));
