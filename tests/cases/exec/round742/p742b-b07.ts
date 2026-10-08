// xl:title `switch` 判别式是 `typeof` / `instanceof` 这类表达式
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: any): string {
  switch (typeof x) {
    case "number": return "number";
    case "string": return "string";
    case "object": return x === null ? "null" : "object";
    default: return "other";
  }
}
console.log(f(1), f("s"), f(null), f([]), f(true), f(undefined));
