// xl:title console.log 的嵌套容器形状
// xl:round 291
// xl:judge stdout
// xl:end

console.log({ a: [1, { b: 2 }], c: new Set([1]) });
console.log([[1, 2], [3]]);
console.log({ n: null, u: undefined, f: () => 1 });
