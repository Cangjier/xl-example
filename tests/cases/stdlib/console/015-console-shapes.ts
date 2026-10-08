// xl:title console.log 的形状：容器、嵌套、函数与多实参
// xl:round 323
// xl:judge stdout
// xl:end

console.log([1, 2], { a: 1 }, [[1], [2]]);
console.log("s", 1, true, null, undefined);
console.log({ f: () => 1 }.f.name, [1, 2, 3].join());
