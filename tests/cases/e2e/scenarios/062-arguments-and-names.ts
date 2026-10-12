// xl:title `arguments`、具名函数表达式与 `toString`
// xl:round 338
// xl:judge stdout
// xl:end

function collect(a: number, b: number): string {
  return a + "/" + b + "/" + arguments.length + "/" + arguments[3];
}
console.log(collect(1, 2), collect(1, 2, 3, 4));
const named = function self(n: number): number { return n <= 1 ? 1 : n * self(n - 1); };
console.log(named(5), typeof (named as any).self);
function outer(x: number) { const inner = () => arguments.length; return inner() + x; }
console.log(outer(10, 20, 30));
console.log(named.toString().includes("self"), (() => 1).toString().includes("=>"));
