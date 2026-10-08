// xl:title 深拷贝与结构比较（不用 structuredClone）
// xl:round 331
// xl:judge stdout
// xl:end

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
function clone(value: Json): Json {
  if (Array.isArray(value)) return value.map((item) => clone(item));
  if (value !== null && typeof value === "object") {
    const out: { [k: string]: Json } = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out;
  }
  return value;
}
function equal(a: Json, b: Json): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!equal(a[i], b[i])) return false;
    return true;
  }
  if (a !== null && b !== null && typeof a === "object" && typeof b === "object"
      && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const key of ka) {
      if (!(key in b)) return false;
      if (!equal(a[key], b[key])) return false;
    }
    return true;
  }
  return a === b;
}
const source: Json = { a: [1, { b: "x" }], c: null, d: true };
const copy = clone(source);
console.log(equal(source, copy));
(copy as any).a.push(2);
console.log(equal(source, copy), (source as any).a.length);
console.log(JSON.stringify(source));
