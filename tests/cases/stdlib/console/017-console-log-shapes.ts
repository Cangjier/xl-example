// xl:title console.log 的多实参、嵌套对象与数组
// xl:round 371
// xl:judge stdout
// xl:end
console.log("a", 1, true, null, undefined);
console.log({ a: 1, b: { c: [1, 2] } });
console.log([1, [2, [3]]]);
console.log({ arr: [], obj: {}, fn: () => 0, sym: Symbol("s"), big: undefined });
console.log("nested", { s: "x", n: NaN, i: Infinity, neg: -0 });
