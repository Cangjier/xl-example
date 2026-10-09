// xl:title `return` 后面紧跟函数表达式：被读成了函数**声明** ⇒ 整份文件进不来
// xl:round 758
// xl:judge stdout
// xl:end
// 第 758 轮登记的这条缺口在第 775 轮收掉了：**收法不是改语句切分**（`return function`
// 那一格 token 层给的就是 `[Keyword(return), Function, ...]`，形状本来就是对的），
// 而是 `print-ast-common.xl.md` 的 `projectExpression` 链那一支——
// **链的头一格是函数 / 类时按表达式位投**（`ctx.expressionPosition`），
// 于是 `return function f() {}.name` 投出 `FunctionExpression`。用例留着当守卫。
const show = (v: any) => (v === null ? "null" : (typeof v) + ":" + String(v));
console.log("1", show((function () { return function f() {}.name; })()));
console.log("2", show((function () { return function () {}.name; })()));
console.log("3", show((function () { return (class {}).name; })()));
