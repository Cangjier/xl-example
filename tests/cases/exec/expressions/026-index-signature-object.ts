// xl:title 索引签名类型：字面量照跑、读法照常
// xl:judge stdout
// xl:end

interface Dict { [k: string]: number }
const d: Dict = { a: 1, b: 2 };
d.c = 3;
let total = 0;
for (const k in d) total += d[k];
console.log(total, Object.keys(d).join(","), d["a"] + d["b"]);
