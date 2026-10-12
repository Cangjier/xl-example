// xl:title JSON.stringify：对象 / 数组 / 嵌套 / 键序
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, b: [1, 2], c: { d: null } }));
console.log(JSON.stringify([1, "a", true, null]));
console.log(JSON.stringify({ b: 1, a: 2 }), JSON.stringify([]), JSON.stringify({}));
