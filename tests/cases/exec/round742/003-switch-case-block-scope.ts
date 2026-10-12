// xl:title `switch` 的 `case` 作用域：同名 `let` 在两格不同块里各自成立
// xl:round 742
// xl:judge stdout
// xl:end
// 第 802 轮改名（原 `p742b-b05`；正文一字未动）。
// 判定点只有一个：**`case` 后面跟一个块时那一格是自己的作用域**——
// 两格里的 `let v` 互不干涉，`default` 排在最后照旧能落到。
function f(x: number): string {
  switch (x) {
    case 1: { let v = "a"; return v + "1"; }
    case 2: { let v = "b"; return v + "2"; }
    default: return "none";
  }
}
console.log(f(1), f(2), f(9));
