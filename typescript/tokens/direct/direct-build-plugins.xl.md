# dependencies
```xl
import { DirectBuildRouter } from "./direct-build-router.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { VariableStatementDirectSession } from "./direct-variable-session.xl.md"
import { ExpressionStatementDirectSession } from "./direct-expression-session.xl.md"
import { ControlFlowStatementDirectSession } from "./direct-control-session.xl.md"
import { FunctionDeclarationDirectSession } from "./direct-function-session.xl.md"
```

# namespace cangjie

全仓唯一的直建注册点：session 实现成员永不改本文件，只有 M3（integration owner）在这里加 `Register` 行。

# class DirectBuildPlugins

```txt
let x = 2*3+1                -> ShellVariable(2)        -> VariableStatementDirectSession
2*3+1                        -> ShellPlainExpression(1) -> ExpressionStatementDirectSession
if (a) b; / { … }            -> ShellStatementFamily(4) / ShellBlock(5) -> ControlFlowStatementDirectSession
function f() { return 1; }   -> ShellFunctionDeclaration(8) -> FunctionDeclarationDirectSession
其它未注册的 kind             -> Router.Create 返回 null（旧路径，行为不变）
```

## static method Install:()=>void

```ts
// 唯一注册点（CONTRACT §3.3）。五行必须留在本方法体内：router ↔ plugins 是 CommonJS 循环 require，
// 只有方法体内的属性访问才会延迟到两个模块都初始化完成之后（放到模块顶层会拿到半初始化的 exports）。
// Strict 由 DirectBuildMetrics.Strict 控制（本文件不碰，默认 false；验收脚本自己置 true）。
// 顺序 = R1 两行不动，R3 三行按 §3.3 追加，R4 只在**末尾**追加第 6 行（§3.3 第 3 条：不改既有 5 行的
// 相对顺序——物理顺序是 `2,1,4,5,8`，R3 审计已接受，本轮不趁机动它）；同一个 session 类注册到多个
// kind 是允许的（Create(kind) 只看 kind）。
// R4-B3-e：`lbl: a;` 的壳是 ShellLabel(6)，R4 之前没有注册行 ⇒ 壳由 legacy 收口（绿但零直建）；
// 箭头函数 / 生成器**不**额外注册（生成器复用 ShellFunctionDeclaration=8，箭头自我激活）。
DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellPlainExpression, ExpressionStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellStatementFamily, ControlFlowStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellBlock, ControlFlowStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellLabel, ControlFlowStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellFunctionDeclaration, FunctionDeclarationDirectSession);
```
