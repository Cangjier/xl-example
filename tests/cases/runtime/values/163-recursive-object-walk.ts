// xl:title 递归遍历任意嵌套结构并汇总
// xl:round 330
// xl:judge stdout
// xl:end

function sum(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    let total = 0;
    for (const item of value) total = total + sum(item);
    return total;
  }
  if (value !== null && typeof value === "object") {
    let total = 0;
    for (const key of Object.keys(value)) total = total + sum((value as any)[key]);
    return total;
  }
  return 0;
}
console.log(sum({ a: 1, b: [2, { c: 3 }], d: null }));
console.log(sum([[1, 2], [3, [4]]]));
