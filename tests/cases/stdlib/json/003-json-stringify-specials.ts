// xl:title JSON.stringify：不可序列化的值怎么处理（函数 / undefined 键）
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: undefined, b: 1 }), JSON.stringify([undefined, 1]));
console.log(JSON.stringify({ f: () => 1, n: 2 }));
