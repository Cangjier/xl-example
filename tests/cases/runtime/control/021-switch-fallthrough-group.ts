// xl:title 多个 case 共用一个体（不写 break 的分组）
// xl:judge stdout
// xl:end

function kind(c: string) {
  switch (c) {
    case "a":
    case "e":
    case "i":
      return "vowel";
    case "b":
      return "cons";
    default:
      return "?";
  }
}
console.log(kind("a"), kind("e"), kind("b"), kind("z"));
