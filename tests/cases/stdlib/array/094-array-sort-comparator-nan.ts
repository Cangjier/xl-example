// xl:title sort 的比较器返回 NaN 时按 0 处理
// xl:round 647
// xl:judge stdout
// xl:end

const xs = [3, 1, 2];
console.log(JSON.stringify(xs.sort(() => NaN)));
console.log(JSON.stringify(["b", "a", "c"].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0))));
