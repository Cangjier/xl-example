// xl:title switch 用的是 ===（字符串与数字不相等）
// xl:judge stdout
// xl:end

function name(n: any) {
  switch (n) {
    case 1: return "num";
    case "1": return "str";
    default: return "other";
  }
}
console.log(name(1), name("1"), name(true));
