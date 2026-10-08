// xl:title 差异补丁的应用与撤销
// xl:round 371
// xl:judge stdout
// xl:end
type Patch = { path: string[]; before: unknown; after: unknown };
function read(obj: any, path: string[]): unknown {
  let cur: any = obj;
  for (const p of path) { if (cur === null || typeof cur !== "object") return undefined; cur = cur[p]; }
  return cur;
}
function write(obj: any, path: string[], value: unknown): void {
  let cur: any = obj;
  for (let i = 0; i < path.length - 1; i++) { cur = cur[path[i]] = cur[path[i]] ?? {}; }
  if (path.length > 0) cur[path[path.length - 1]] = value;
}
function makePatch(before: any, after: any, path: string[] = [], out: Patch[] = []): Patch[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  for (const key of keys) {
    const a = before?.[key];
    const b = after?.[key];
    if (a === b) continue;
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      makePatch(a, b, path.concat(key), out);
    } else {
      out.push({ path: path.concat(key), before: a, after: b });
    }
  }
  return out;
}
function apply(target: any, patches: Patch[], direction: "forward" | "backward"): any {
  const clone = JSON.parse(JSON.stringify(target));
  for (const p of patches) write(clone, p.path, direction === "forward" ? p.after : p.before);
  return clone;
}
const v1 = { name: "a", nested: { x: 1, y: 2 }, list: [1] };
const v2 = { name: "b", nested: { x: 1, y: 9 }, list: [2] };
const patches = makePatch(v1, v2);
for (const p of patches) console.log(p.path.join("."), JSON.stringify(p.before), "->", JSON.stringify(p.after));
console.log(JSON.stringify(apply(v1, patches, "forward")) === JSON.stringify(v2));
console.log(JSON.stringify(apply(v2, patches, "backward")) === JSON.stringify(v1));
console.log(JSON.stringify(v1), patches.length);
