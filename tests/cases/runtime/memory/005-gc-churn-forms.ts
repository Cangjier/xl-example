// xl:title 分配压力：反复建造与丢弃对象
// xl:round 371
// xl:judge stdout
// xl:end
let last = 0;
for (let i = 0; i < 20000; i++) {
  const o = { a: i, b: [i, i + 1], c: "s" + i };
  last = o.b[0];
}
console.log(last);
const pooled: number[][] = [];
for (let i = 0; i < 2000; i++) pooled.push(new Array(10).fill(i));
console.log(pooled.length, pooled[1999][9]);
const strings: string[] = [];
for (let i = 0; i < 3000; i++) strings.push(String(i));
console.log(strings.join("").length);
console.log("done");
