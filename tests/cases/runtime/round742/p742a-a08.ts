// xl:title `switch` 在循环里：`break` 只出 `switch`、`continue` 出循环
// xl:round 742
// xl:judge stdout
// xl:end
const out: string[] = [];
for (let i = 0; i < 4; i++) {
  switch (i) {
    case 0: out.push("zero"); break;
    case 1: continue;
    case 2: out.push("two");
    default: out.push("d" + i);
  }
  out.push("after" + i);
}
console.log(out.join(","));
