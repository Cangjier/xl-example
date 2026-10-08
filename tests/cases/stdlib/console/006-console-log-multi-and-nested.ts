// xl:title console.log 多个实参 + 嵌套容器的形态
// xl:judge stdout
// xl:end

console.log("a", 1, true, null, undefined);
console.log([1, [2, [3]]], { a: { b: [1, 2] } });
console.log({ s: "x", n: 2, ok: false, nested: { deep: { deeper: 1 } } });
