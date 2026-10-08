// xl:title `do...while` 里的 `continue` 仍然要走条件
// xl:round 691
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
