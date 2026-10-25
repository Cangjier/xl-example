# dependencies
```xl
import { DirectBuildRouter } from "./direct-build-router.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
import { VariableStatementDirectSession } from "./direct-variable-session.xl.md"
import { ExpressionStatementDirectSession } from "./direct-expression-session.xl.md"
```

# namespace cangjie

全仓唯一的直建注册点：session 实现成员永不改本文件，只有 M3（integration owner）在这里加 `Register` 行。

# class DirectBuildPlugins

```txt
let x = 2*3+1                -> ShellVariable(2)        -> VariableStatementDirectSession
2*3+1                        -> ShellPlainExpression(1) -> ExpressionStatementDirectSession
function f() { return 1; }   -> 未注册的 kind            -> Router.Create 返回 null（旧路径，行为不变）
```

## static method Install:()=>void

```ts
// 唯一注册点（CONTRACT §3.3）。两行必须留在本方法体内：router ↔ plugins 是 CommonJS 循环 require，
// 只有方法体内的属性访问才会延迟到两个模块都初始化完成之后（放到模块顶层会拿到半初始化的 exports）。
// Strict 由 DirectBuildMetrics.Strict 控制（本文件不碰，默认 false；验收脚本自己置 true）。
DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellPlainExpression, ExpressionStatementDirectSession);
```
