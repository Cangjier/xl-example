// xl:title `Object.groupBy` 的键一定是字符串
// xl:round 305
// xl:judge stdout
// xl:end

const g = Object.groupBy([1, 2, 3], (n) => n % 2);
console.log(Object.keys(g).join(","), JSON.stringify(g));
