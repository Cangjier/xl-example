// xl:title 循环的四种写法与标签控制
// xl:round 371
// xl:judge stdout
// xl:end
const out: string[] = [];
for (let i = 0; i < 3; i++) out.push("f" + i);
let j = 0;
while (j < 2) { out.push("w" + j); j += 1; }
let k = 0;
do { out.push("d" + k); k += 1; } while (k < 2);
const obj = { a: 1, b: 2 };
for (const key in obj) out.push("i" + key);
outer: for (const x of [1, 2, 3]) {
  for (const y of [1, 2]) {
    if (y === 2) continue outer;
    if (x === 3) break outer;
    out.push("n" + x + y);
  }
}
console.log(out.join(","));
