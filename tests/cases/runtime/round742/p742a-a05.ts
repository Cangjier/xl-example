// xl:title `switch` 比的是**严格相等**：`1` 对 `"1"`、`NaN`、`-0`
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: any): string {
  switch (x) {
    case 1: return "num";
    case "1": return "str";
    case NaN: return "nan";
    case 0: return "zero";
    default: return "none";
  }
}
console.log(f(1), f("1"), f(NaN), f(0), f(-0), f(true));
