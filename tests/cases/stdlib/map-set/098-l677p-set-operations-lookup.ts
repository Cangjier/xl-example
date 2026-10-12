// xl:title 点名：Set 的集合运算七格（union / intersection / difference / isSubsetOf …）在不在
// xl:judge stdout
// xl:end

const s = new Set([1, 2]);
const names = ["union", "intersection", "difference", "symmetricDifference", "isSubsetOf", "isSupersetOf", "isDisjointFrom"];
console.log(names.map((n) => typeof s[n]).join(","));
console.log([...s].filter((n, i, arr) => arr.indexOf(n) === i).join(","));
