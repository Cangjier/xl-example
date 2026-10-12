// xl:title stringify 的缩进实参：数字、字符串、超范围
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ a: [1, 2] }, null, 2));
console.log(JSON.stringify({ a: 1 }, null, "\t"));
console.log(JSON.stringify({ a: 1 }, null, 0));
console.log(JSON.stringify({ a: 1 }, null, 11));
