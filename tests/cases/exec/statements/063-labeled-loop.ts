// xl:title 带标签的 `break` / `continue`
// xl:round 691
// xl:judge stdout
// xl:end
const out: string[] = [];
outer: for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 3; j++) {
    if (j === 1) continue outer;
    if (i === 2) break outer;
    out.push(i + ":" + j);
  }
}
console.log(out.join(","));
