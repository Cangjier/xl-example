// xl:title `switch` 的 `case` 作用域：同名 `let` 在两格不同块里各自成立
// xl:round 742
// xl:judge stdout
// xl:end
function f(x: number): string {
  switch (x) {
    case 1: { let v = "a"; return v + "1"; }
    case 2: { let v = "b"; return v + "2"; }
    default: return "none";
  }
}
console.log(f(1), f(2), f(9));
