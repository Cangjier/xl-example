// xl:title Set：交并差 / 子集判断 / 迭代顺序
// xl:round 9
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log([...a.intersection(b)].join(","), [...a.union(b)].join(","), [...a.difference(b)].join(","));
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isSupersetOf(new Set([1])));
console.log([...new Set("abca")].join(""));
