// xl:title `default` 在**中间**：它仍然最后才匹配、匹配到了就往下落
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: string): string {
  let out = "";
  switch (x) {
    case "a": out += "A";
    default: out += "D";
    case "b": out += "B";
  }
  return out;
}
console.log(f("a"), f("b"), f("z"));
