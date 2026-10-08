// xl:title 数组方法的 `thisArg` 那一格
// xl:round 691
// xl:judge stdout
// xl:end
const ctx: any = { k: 10 };
const seen: number[] = [];
[1, 2].forEach(function (this: any, v: number) { seen.push(v + this.k); }, ctx);
console.log(seen.join(","));
console.log(JSON.stringify([1, 2].map(function (this: any, v: number) { return v + this.k; }, ctx)));
console.log([1, 2].filter(function (this: any, v: number) { return v < this.k; }, ctx).length);
