# dependencies
```xl
import { DirectBuildRouter } from "./direct-build-router.xl.md"
import { StatementRoute } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

全仓唯一的直建注册点：session 实现成员永不改本文件，只有 M3（integration owner）在这里加 `Register` 行。

# class DirectBuildPlugins

```txt
// M1/M2 合入后 Install() 的全部内容：
DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);
DirectBuildRouter.Register(StatementRoute.ShellPlainExpression, ExpressionStatementDirectSession);
```

## static method Install:()=>void

```ts
// TODO(M3-wire)：M1 的 DirectExpressionEngine / DirectTokenUtil 与 M2 的两个 session 合入后，在这里打开
// 下面两行——扩展点规则是「新族 = 新 direct-<family>-session.xl.md + 本文件里一行 Register」。
// 本轮（契约 + hooks 骨架）刻意保持空实现：`DirectBuildRouter.Factories` 为空
// → `DirectBuildRouter.Create` 恒返回 null → 没有任何语句交给直建，行为与基线逐字节不变。
//
// DirectBuildRouter.Register(StatementRoute.ShellVariable, VariableStatementDirectSession);
// DirectBuildRouter.Register(StatementRoute.ShellPlainExpression, ExpressionStatementDirectSession);
```
