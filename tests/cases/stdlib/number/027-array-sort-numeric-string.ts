// xl:title sort 缺省按字符串、给比较器按数字
// xl:round 304
// xl:judge stdout
// xl:end

const xs = [10, 1, 2, 20];
console.log(xs.slice().sort().join(","), xs.slice().sort((a, b) => a - b).join(","));
const words = ["b", "A", "a", "B"];
console.log(words.slice().sort().join(","));
