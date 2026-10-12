// xl:title stringify 的键序 / 稀疏数组 / 函数与 symbol
// xl:round 653
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ 2: "b", 1: "a", x: 1, 0: "c" }));
console.log(JSON.stringify([1, , 3]), JSON.stringify({ a: undefined, b: () => 1, c: Symbol("s"), d: 1 }));
console.log(JSON.stringify([undefined, null, NaN, Infinity]));
console.log(JSON.stringify({ a: [1, { b: 2 }] }, null, 1).split("\n").join("|"));
