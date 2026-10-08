// xl:title 悬垂 `else` 归属最近的那个 `if`
// xl:round 742
// xl:judge stdout
// xl:end
function f(a: boolean, b: boolean): string {
  if (a) if (b) return "ab"; else return "a!b";
  return "!a";
}
console.log(f(true, true), f(true, false), f(false, true));
