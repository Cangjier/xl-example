// xl:title 字符串拼接的压力：一万次追加与连接
// xl:round 371
// xl:judge stdout
// xl:end
let acc = "";
for (let i = 0; i < 10000; i++) acc += i % 10;
console.log(acc.length, acc.slice(0, 5), acc.slice(-5));
const parts: string[] = [];
for (let i = 0; i < 5000; i++) parts.push("x" + (i % 7));
console.log(parts.join("").length, parts.length);
const big = "ab".repeat(20000);
console.log(big.length, big.slice(0, 2), big.indexOf("ab", 1000));
