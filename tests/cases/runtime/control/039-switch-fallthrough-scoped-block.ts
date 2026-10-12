// xl:title switch 贯穿 + 每段一个块作用域
// xl:round 7
// xl:judge stdout
// xl:end

function kind(n: number): string {
  let out = "";
  switch (n) {
    case 0: {
      const tag = "zero";
      out += tag + ";";
    }
    case 1: {
      const tag = "one";
      out += tag + ";";
    }
    case 2:
      out += "two;";
      break;
    default:
      out += "other;";
  }
  return out;
}
for (const n of [0, 1, 2, 5]) console.log(kind(n));
