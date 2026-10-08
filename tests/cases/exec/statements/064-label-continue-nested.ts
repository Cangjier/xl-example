// xl:title 带标签的 `continue` 在 `while` + `switch` 里
// xl:round 691
// xl:judge stdout
// xl:end
const out: string[] = [];
outer: for (let i = 0; i < 3; i++) {
  switch (i) {
    case 1: continue outer;
    default: out.push("d" + i);
  }
  while (true) { out.push("w" + i); break; }
}
console.log(out.join(","));
