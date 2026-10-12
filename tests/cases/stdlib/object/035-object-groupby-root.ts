// xl:title Object.groupBy 分组
// xl:judge stdout
// xl:end

const g = Object.groupBy([1, 2, 3, 4], (n) => (n % 2 ? "odd" : "even"));
console.log(g.odd!.join(","), g.even!.join(","));
