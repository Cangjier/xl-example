// xl:title Object.groupBy：分组表该是 null 原型的对象
// xl:judge stdout
// xl:why 第 690 轮收掉了：分组表现在真的是 null 原型（`Object.getPrototypeOf` 给 `null`、
//       `"toString" in g` 是假）。第 295 轮给的是普通对象，理由是「`Object.create(null)`
//       本仓表达不了」——那句理由第 299 轮就不成立了。台账（原来记 `differ`）随之撤掉。
// xl:end

const grouped = Object.groupBy([1, 2, 3], (n: number) => (n % 2 ? "odd" : "even"));
console.log(Object.getPrototypeOf(grouped));
console.log(grouped.odd?.join(","), grouped.even?.join(","));
