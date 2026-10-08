// xl:title Set 的集合运算：union / intersection / difference / symmetricDifference
// xl:round 323
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log([...a.union(b)].join(","));
console.log([...a.intersection(b)].join(","));
console.log([...a.difference(b)].join(","));
console.log([...a.symmetricDifference(b)].join(","));
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])), a.isDisjointFrom(b));
