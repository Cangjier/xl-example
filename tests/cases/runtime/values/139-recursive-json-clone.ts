// xl:title 手写递归深拷贝（数组 / 对象 / 原始值三档）
// xl:round 305
// xl:judge stdout
// xl:end

function clone(v: any): any {
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === "object") {
    const o: any = {};
    for (const k of Object.keys(v)) o[k] = clone(v[k]);
    return o;
  }
  return v;
}
const src = { a: [1, { b: 2 }], c: "x" };
const copy = clone(src);
copy.a[1].b = 99;
console.log(JSON.stringify(src), JSON.stringify(copy));
