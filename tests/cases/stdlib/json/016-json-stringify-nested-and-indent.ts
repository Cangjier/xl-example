// xl:title JSON.stringify 的嵌套与缩进
// xl:round 291
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: [1, { b: 2 }], c: "x" }));
console.log(JSON.stringify([1, [2, [3]]], null, 1));
