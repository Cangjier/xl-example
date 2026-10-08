// xl:title 没有 `default` 又没有匹配：整段跳过
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  let out = "none";
  switch (x) {
    case 1: out = "one"; break;
    case 2: out = "two";
  }
  return out;
}
console.log(f(1), f(2), f(3));
