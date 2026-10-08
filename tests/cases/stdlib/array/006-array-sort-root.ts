// xl:title Array.sort：默认按文本、给了比较器按比较器（且返回原数组）
// xl:judge stdout
// xl:end

const xs = [10, 9, 1, 2];
console.log(xs.slice().sort().join(","));
console.log(xs.slice().sort((a, b) => a - b).join(","));
console.log(xs.slice().sort((a, b) => b - a).join(","));
const words = ["pear", "apple", "fig"];
console.log(words.sort().join(","), words.join(","));
