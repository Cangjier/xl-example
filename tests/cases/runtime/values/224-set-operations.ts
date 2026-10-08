// xl:title Set 的集合运算方法
// xl:round 651
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log([...a.union(b)].join(","), [...a.intersection(b)].join(","), [...a.difference(b)].join(","));
console.log([...a.symmetricDifference(b)].join(","), a.isSubsetOf(b), a.isSupersetOf(b), a.isDisjointFrom(b));
