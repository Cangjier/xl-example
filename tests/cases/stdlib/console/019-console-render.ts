// xl:title console.log 的多实参渲染（对象 / 数组 / 嵌套 / 函数）
// xl:round 623
// xl:judge stdout
// xl:end

console.log({ a: 1, b: [1, 2], c: { d: null } });
console.log([1, [2, [3]]], [], {});
console.log("s", 1, true, null, undefined, Symbol("y"));
console.log(function named() {}, class Named {});
