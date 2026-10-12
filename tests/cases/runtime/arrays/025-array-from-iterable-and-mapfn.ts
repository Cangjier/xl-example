// xl:title Array.from 三种来源：数组式对象、可迭代对象、映射函数
// xl:round 323
// xl:judge stdout
// xl:end

console.log(Array.from({ length: 2, 0: "a" }).join(","));
console.log(Array.from(new Set([1, 2, 2])).join(","));
console.log(Array.from([1, 2, 3], (v, i) => v * 10 + i).join(","));
console.log(Array.from("abc").join(","), Array.from(new Map([["k", "v"]])).length);
