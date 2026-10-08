// xl:title default 写在最前面：仍然从匹配的 case 进、顺序走到底
// xl:judge stdout
// xl:end

function pick(n: number) {
  switch (n) {
    default: return "d";
    case 1: return "one";
    case 2: return "two";
  }
}
console.log(pick(1), pick(2), pick(9));
