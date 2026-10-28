# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketRoleHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ControlHeadPossibleShape } from "./control-head-possible-shape.xl.md"
import { ExpressionBracketPossibleShape } from "../expressions/forms/shared/expression-bracket-possible-shape.xl.md"
import { ParameterListPossibleShape } from "../types/parameter-list-possible-shape.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class BracketRoleCatalogHook extends BracketRoleHook

```text
BracketRoleResolver.RegisterCatalog(new BracketRoleCatalog("ParameterList", [ ...候选... ], null));
StatementRouteUtil.EnableBracketRoleCatalog = true;   // 由 B1 的探针 / harness 打开
```

## static field Installed:bool = false

## static method EnsureInstalled:()=>void

```ts
if (!StatementRouteUtil.EnableBracketRoleCatalog && !StatementRouteUtil.EnableBracketCreatePossible) {
  return;
}
if (BracketRoleHook.Current !== null) {
  return;
}
BracketRoleHook.Current = new BracketRoleCatalogHook();
BracketRoleCatalogHook.Installed = true;
```

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

```ts
if (bracket === null || !(bracket instanceof Bracket)) {
  return;
}
const shape = bracket as Bracket;
if (!StatementRouteUtil.EnableBracketRoleCatalog) {
  return;
}
// 三条线按「最窄 → 最宽」分派：控制头 / 表达式括号 / 参数表。
// 每条线只在自己认得这只括号与它的角色时返回 true 并完成（幂等的）安装。
if (ControlHeadPossibleShape.InstallAtBracketCreated(host, shape, context)) {
  return;
}
if (ExpressionBracketPossibleShape.InstallAtBracketCreated(host, shape, context)) {
  return;
}
ParameterListPossibleShape.InstallAtBracketCreated(host, shape, context);
```
