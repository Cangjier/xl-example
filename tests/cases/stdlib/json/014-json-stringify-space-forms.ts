// xl:title JSON.stringify 的第三格：数字与字符串缩进
// xl:judge stdout
// xl:end

console.log(JSON.stringify({ a: 1, b: [2, 3] }, null, 2));
console.log(JSON.stringify([1, { c: 2 }], null, "\t"));
