// xl:title `return` 后面紧跟函数表达式：被读成了函数**声明** ⇒ 整份文件进不来
// xl:round 758
// xl:judge stdout
// xl:want blocked
// xl:why **量出来的形状**（第 758 轮普查里**当场红**的那两行）：`return function f() {}.name`
// xl:why 是**函数表达式**（合法 TS/JS，Node 给 `"f"`），而本仓的语句切分把 `function`
// xl:why 那三个字读成**声明**的开头 ⇒ 降级期报
// xl:why `unimplemented: expression FunctionDeclaration`（`lowering.xl.md` 的
// xl:why `LowerExpression` 兜底那一句），**整份文件一个字节都不跑**。
// xl:why **同一格里三种写法只有这一种红**：`return (function f() {})`（带括号）**过**、
// xl:why `const x = function f() {}` **过**、`f; function f() {}`（声明自己一行）**过**——
// xl:why 差的只是「`return` 与 `function` **紧挨着**」这一格。
// xl:why **为什么这一轮不顺手收**：切分那一层读的是 token 树的形状，
// xl:why 「`function` 落在表达式位里该按表达式读」要 token 层先有这条判据
// xl:why （与 `typescript/tokens/statement.xl.md` 的 `IsLineBreakBoundary` 同一处，
// xl:why 见 `tests/parse/typescript-parsing-gaps.md` 第 55 行那一段）——
// xl:why 改它要连带重跑 1414 份 token 语料。**先如实登记，不猜**。
// xl:end
const show = (v: any) => (v === null ? "null" : (typeof v) + ":" + String(v));
console.log("1", show((function () { return function f() {}.name; })()));
console.log("2", show((function () { return function () {}.name; })()));
console.log("3", show((function () { return (class {}).name; })()));
