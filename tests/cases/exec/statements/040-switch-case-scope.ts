// xl:title switch 的块作用域：所有 case 共享一个块（同名 let 会撞）
// xl:round 7
// xl:judge stdout
// xl:end

function f(n: number): string {
  switch (n) {
    case 1: { const v = "one"; return v; }
    case 2: { const v = "two"; return v; }
    default: { const v = "other"; return v; }
  }
}
console.log(f(1), f(2), f(3));
function g(n: number): number {
  switch (n) { case 0: let z = 1; return z; default: return -1; }
}
console.log(g(0), g(1));
