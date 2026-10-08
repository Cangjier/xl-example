// xl:title Object.groupBy：分组表该是 null 原型的对象
// xl:judge stdout
// xl:want differ
// xl:why `Object.groupBy` 的分组表该是 null 原型对象，这里给了带 Object.prototype 的普通对象（静默错值）
// xl:end

const grouped = Object.groupBy([1, 2, 3], (n: number) => (n % 2 ? "odd" : "even"));
console.log(Object.getPrototypeOf(grouped));
console.log(grouped.odd?.join(","), grouped.even?.join(","));
