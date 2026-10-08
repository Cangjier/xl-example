// xl:title console.log 容器形状：嵌套数组 / 对象 / Map / Set / 多参
// xl:judge stdout
// xl:end

console.log([1, [2, 3]], { a: { b: 1 } });
console.log(new Map([["k", 1]]), new Set([1, 2]));
console.log("a", 1, true, null, undefined, [1]);
console.log([], {}, [], [{}]);
