// xl:title 索引签名对象的遍历与取值
// xl:round 371
// xl:judge stdout
// xl:end
interface Dict { [key: string]: number }
const d: Dict = { a: 1, b: 2 };
d["c"] = 3;
let total = 0;
for (const k in d) total += d[k];
console.log(total, Object.keys(d).join(","), Object.values(d).join(","));
const entries = Object.entries(d);
console.log(entries.map(([k, v]) => k + "=" + v).join(" "));
console.log(d["missing"]);
