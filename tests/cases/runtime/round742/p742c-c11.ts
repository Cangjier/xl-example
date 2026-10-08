// xl:title `do...while` 至少跑一次 + `continue` 跳去条件
// xl:round 742
// xl:judge stdout
// xl:end
let i = 0;
const out: number[] = [];
do {
  i++;
  if (i % 2 === 0) continue;
  out.push(i);
} while (i < 5);
console.log(out.join(","), i);
