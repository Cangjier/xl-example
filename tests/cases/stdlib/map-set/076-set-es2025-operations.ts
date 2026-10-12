// xl:title ES2025 集合运算：union / intersection / difference / 三问（含 isSupersetOf）
// xl:round 647
// xl:judge stdout
// xl:end

const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);
console.log(JSON.stringify([...a.union(b)]), JSON.stringify([...a.intersection(b)]));
console.log(JSON.stringify([...a.difference(b)]), JSON.stringify([...a.symmetricDifference(b)]));
console.log(a.isSubsetOf(b), a.isSupersetOf(b), a.isDisjointFrom(b));
console.log(new Set([1]).isSubsetOf(a), a.isSupersetOf(new Set([1, 2])));
console.log(new Set().isSupersetOf(a), a.isSupersetOf(new Set()), new Set().isDisjointFrom(a));
console.log(typeof a.isSupersetOf, typeof a.union, typeof a.isDisjointFrom);
