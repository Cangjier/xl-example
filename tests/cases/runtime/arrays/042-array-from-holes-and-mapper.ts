// xl:title Array.from 对稀疏数组 / 类数组 / 映射函数
// xl:round 7
// xl:judge stdout
// xl:end

const sparse = [1, , 3];
console.log(Array.from(sparse, (v, i) => i + ":" + String(v)).join("|"));
console.log(Array.from({ length: 3 }, (_, i) => i * 2).join(","));
console.log(Array.from("abc", (c) => c.toUpperCase()).join(""));
