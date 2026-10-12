// xl:title 端到端：switch 贯穿 + 标签跳出外层循环 + continue 到标签
// xl:round 639
// xl:judge stdout
// xl:end

function grade(n: number): string {
  let out = "";
  switch (n) {
    case 90:
    case 91:
      out += "A";
      break;
    case 80:
      out += "B";
    default:
      out += "?";
  }
  return out;
}
console.log(grade(90), grade(80), grade(1));
const found: string[] = [];
outer: for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (j === 1) continue outer;
    if (i === 2) break outer;
    found.push(`${i}${j}`);
  }
}
console.log(found.join(","));
