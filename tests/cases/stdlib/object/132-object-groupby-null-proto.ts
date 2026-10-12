// xl:title `Object.groupBy` 的分组表没有原型（`OrdinaryObjectCreate(null)`）
// xl:round 690
// xl:judge stdout
// xl:why 第 295 轮给的是**带 `Object.prototype` 的普通对象**，理由写的是
//       「`Object.create(null)` 本仓表达不了」——那句理由第 299 轮就不成立了
//       （`ObjectCreate` 那一支真的把 `Proto = 0` 写了进去）。
//       第 690 轮照同一条路补上：`Object.getPrototypeOf(g)` 给 `null`、
//       `"toString" in g` 是**假**（原来静默给真），而分组本身一个都不少。
// xl:end
const g: any = Object.groupBy([1, 2, 3], (n: number) => (n % 2 ? "odd" : "even"));
console.log("proto", Object.getPrototypeOf(g));
console.log("in", "toString" in g, "hasOwnProperty" in g, "odd" in g);
console.log("keys", Object.keys(g).join(","));
console.log("buckets", g.odd.join(","), g.even.join(","));
