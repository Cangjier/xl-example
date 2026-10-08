// xl:title Array.from：映射函数 / 字符串 / Set / Map / 长度对象
// xl:judge stdout
// xl:end

console.log(Array.from([1, 2], (v) => v * 2).join(","));
console.log(Array.from("abc").join("-"), Array.from("abc").length);
console.log(Array.from(new Set([1, 2, 2])).join(","));
console.log(JSON.stringify(Array.from(new Map([["a", 1]]))));
console.log(Array.from({ length: 3 }, (_: any, i: number) => i).join(","));
