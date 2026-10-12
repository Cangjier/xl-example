// xl:title switch 体里花括号声明与 break 的配合
// xl:judge stdout
// xl:end

function f(n: number) {
  let out = "";
  switch (n) {
    case 1: {
      const label = "one";
      out += label;
      break;
    }
    case 2:
      out += "two";
      break;
    default:
      out += "many";
  }
  return out;
}
console.log(f(1), f(2), f(7));
