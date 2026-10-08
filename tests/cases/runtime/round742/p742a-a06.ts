// xl:title `-0` 与 `0` 是同一格：第一个 `case -0` 把两个都接走
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case -0: return "negzero";
    case 0: return "zero";
  }
  return "none";
}
console.log(f(0), f(-0), f(1));
