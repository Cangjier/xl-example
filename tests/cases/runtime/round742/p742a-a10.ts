// xl:title `switch (true)` 那种写法：`case` 是布尔表达式
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (true) {
    case x < 0: return "neg";
    case x === 0: return "zero";
    default: return "pos";
  }
}
console.log(f(-1), f(0), f(1));
