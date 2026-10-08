// xl:title Object.fromEntries / groupBy 的形状
// xl:round 9
// xl:judge stdout
// xl:end

console.log(JSON.stringify(Object.fromEntries([["a", 1], ["b", 2]])));
const grouped = Object.groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
console.log(JSON.stringify(grouped));
