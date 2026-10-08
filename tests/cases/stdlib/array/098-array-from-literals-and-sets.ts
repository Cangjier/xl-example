// xl:title Array.from：可迭代物的几种（串 / Set / Map / 生成器）
// xl:judge stdout
// xl:end

function* g() { yield 1; yield 2; }
console.log(Array.from("abc").join(","), Array.from(new Set([1, 1, 2])).join(","));
console.log(Array.from(new Map([["a", 1]])).map((p) => p.join("=")).join(","));
console.log(Array.from(g()).join(","), Array.isArray(Array.from("ab")));
