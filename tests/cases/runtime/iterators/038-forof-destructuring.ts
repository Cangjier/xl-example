// xl:title `for...of` 里直接解构（`for (const [k, v] of map)`）
// xl:round 691
// xl:judge stdout
// xl:end
const m: any = new Map<any, any>([["a", 1], ["b", 2]]);
for (const [k, v] of m) console.log(k, v);
for (const [i, ch] of (["x", "y"] as any).entries()) console.log(i, ch);
