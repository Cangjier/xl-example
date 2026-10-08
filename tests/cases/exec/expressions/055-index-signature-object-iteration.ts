// xl:title 索引签名对象的遍历
// xl:round 305
// xl:judge stdout
// xl:end

interface Dict { [key: string]: number }
const d: Dict = { a: 1, b: 2 };
let total = 0;
for (const k of Object.keys(d)) total += d[k];
console.log(total, Object.keys(d).join(","));
