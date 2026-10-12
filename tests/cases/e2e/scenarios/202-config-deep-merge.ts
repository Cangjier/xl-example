// xl:title 端到端：配置深合并（数组替换、对象递归、undefined 不覆盖、Symbol 键）
// xl:round 7
// xl:judge stdout
// xl:end

const meta = Symbol("meta");
function isPlain(v: any): boolean { return v !== null && typeof v === "object" && !Array.isArray(v); }
function merge(base: any, patch: any): any {
  if (!isPlain(base) || !isPlain(patch)) return patch === undefined ? base : patch;
  const out: any = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    out[k] = isPlain(out[k]) && isPlain(v) ? merge(out[k], v) : v === undefined ? out[k] : v;
  }
  return out;
}
const base: any = { a: 1, nest: { x: 1, y: 2 }, list: [1, 2], keep: "k" };
base[meta] = { tag: "b" };
const patch: any = { a: 2, nest: { y: 9, z: 3 }, list: [3], keep: undefined, fresh: true };
patch[meta] = { tag: "p" };
const out = merge(base, patch);
console.log(JSON.stringify(out));
console.log(out.list.length, out.nest.x, out.keep, out.fresh, (out as any)[meta].tag);
console.log(JSON.stringify(base), out !== base, out.nest !== base.nest);
