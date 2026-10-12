// xl:note 类型谓词三种写法：`x is T` / `asserts x is T` / `asserts x`（第 66 轮第三批）
// xl:expect TypePredicate:3,Function:3,Keyword:5
function f(x: unknown): x is string { return true }
function g(x: unknown): asserts x is string {}
function h(x: unknown): asserts x {}
