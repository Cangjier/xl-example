// xl:title Array.isArray / Array.from（数组、字符串、集合、映射函数）
// xl:judge stdout
// xl:end

console.log(Array.isArray([]), Array.isArray({}), Array.isArray("ab" as any));
console.log(Array.from("abc").join(","), Array.from(new Set([1, 2])).join(","));
console.log(Array.from([1, 2], (v) => v * 3).join(","));
