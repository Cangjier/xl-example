// xl:title 逻辑运算与空值合并：短路、返回值、赋值的结合
// xl:round 371
// xl:judge stdout
// xl:end
const a = 0 || "fallback";
const b = "" && "never";
const c = null ?? "d";
const d = 0 ?? "e";
const e = undefined ?? null ?? "last";
console.log(a, JSON.stringify(b), c, d, e);
let n: number | null = null;
n ??= 5;
console.log(n);
n ||= 9;
console.log(n);
n &&= 0;
console.log(n);
const o: any = { v: { deep: 1 } };
console.log(o?.v?.deep ?? "no", o.x?.y ?? "no2", o.v.deep ?? "no3");
