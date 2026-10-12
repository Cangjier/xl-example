// xl:title `JSON.stringify` 的控制字符与非 ASCII
// xl:round 330
// xl:judge stdout
// xl:end

console.log(JSON.stringify("a\nb\tc"));
console.log(JSON.stringify("\u0001"));
console.log(JSON.stringify("中文😀"));
console.log(JSON.stringify({ k: "a\"b" }));
