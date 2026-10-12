// xl:title console.log 对复杂值的渲染
// xl:round 371
// xl:judge stdout
// xl:end
console.log([1, 2, 3], [[1], [2]]);
console.log({ a: 1, b: [1, 2], c: { d: null } });
console.log(new Map([["k", 1]]), new Set([1, 2]));
console.log(new Date(0), new Error("e").message);
console.log([undefined, null, NaN, -0, Infinity]);
console.log({ fn: function named() {}, arrow: () => 0, cls: class C {} });
