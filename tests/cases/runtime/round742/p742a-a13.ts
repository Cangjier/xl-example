// xl:title `switch` 里的 `var` 提升到函数作用域
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1: var v = "one"; break;
    default: v = "def";
  }
  return String(v);
}
console.log(f(1), f(2));
