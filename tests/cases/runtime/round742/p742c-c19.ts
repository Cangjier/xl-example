// xl:title `do...while` 里的带标签 `continue`
// xl:round 742
// xl:judge stdout
// xl:end
const out: number[] = [];
let i = 0;
outer: do {
  i++;
  if (i === 2) continue outer;
  out.push(i);
} while (i < 4);
console.log(out.join(","), i);
