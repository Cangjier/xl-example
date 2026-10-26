# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { CompositeInitializerFormsJudge } from "./composite-initializer-forms-judge.xl.md"
```

# namespace cangjie

# class CompositeInitializerFormsPossibleShape extends PossibleShape

**A4b 复合初始化器候选**（数组 / 括号 / 箭头 / 函数 / 类 / 三元）。与 A4 的
`CompositeInitializerPossibleShape`（对象字面量 `{...}`）并列注册；两者认领的形态**互斥**
（A4 只认单只 `{`，本候选不认 `{`）。

判据与建树都在 `CompositeInitializerFormsJudge`（与声明终结候选共用同一份实现，避免两处口径漂移）。

**为什么不会碰别的形态**：`ComputeByIndex` 只在 `=` 之后第一个代码单元命中本候选族时保持存活
（其余 `Reject`），且 `Accept` 只在「`ExpressionBuilder` 能整段吃完 + 之后只剩输入结束」的那一格；
`;` 收口（A6）、`as`/`satisfies`（A5）、带类型注解的参数（A5）、对象字面量（A4）都不认领。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）：只追加本候选一个实例。

```ts
shapes.push(new CompositeInitializerFormsPossibleShape());
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

- 越界 / trivia → `Uncertain`（E0b 实测约束 1：`=` 与 trivia 必须保持存活，`Reject` 在本条目内永不回来）；
- `Symbol("=")` → `Uncertain`（初始化器还没开始）；
- 形态不命中（`Family === ""`）→ `Reject`（不是本 WP 的初始化器，交给其它候选 / C10）；
- 形态命中但还没长完 → `Uncertain`（继续等后续单元）；
- 长完（`CanBuild`）→ `Accept`（目录在这一格建树）。

> 形态命中后**不能**因为「还没长完」就 `Reject`：`CatalogGuide` 的 `Reject` 是永久的，
> `()` 关闭后还有 `=>`、`=>` 之后还有函数体，所以必须保持 `Uncertain`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (CompositeInitializerFormsJudge.Family(units) === "") {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

**注意**：本方法只回答「这一格本候选还在不在场」。真正的建树条件（整段吃完 + 只剩输入结束）在
`IsBuildable` 里判——`Accept` 但 `IsBuildable === false` 时目录只会 `Waiting`，不会建。

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

**P4b**：`= (...)` 的括号关闭格上、`)` 之后紧跟二元运算符时**认领这一格**（D0 的通用委派
`ExpressionContinuationCatalog.Claims` 唯一问得到的入口；语义是「继续等」，不是「支持」）。

不放行的话，声明终结候选会在 `)` 格按 C10 抛「declaration 括号」，`let x = (1+2)*3` 的增量路径连
`*` / `3` 那两格都到不了——这正是 `bin-paren-mul` 长期停在 `throw` 的根因（A4b 的 `CanBuild` 要求
「之后只剩输入结束」，`*` 没到之前它永远判假）。

判据本体在 `CompositeInitializerFormsJudge.OperatorContinuation`（限定 paren 族 + 已闭合的 `(` 括号 +
二元运算符首字符），这里只做一次转调，不在候选里另写一份。

```ts
return CompositeInitializerFormsJudge.OperatorContinuation(units);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

`CanBuild` 为真才建：形态命中 + legacy `ExpressionBuilder` 整段吃完 + 最后一个代码单元之后只剩输入结束。

`PossibleShape` 没有模板字段，`Template` 从 `context.Root` 取（与 `CatalogGuide` 用同一个上下文宿主），
这样 `IsBuildable` 与 `BuildByIndex` 用的是同一份模板。

```ts
return CompositeInitializerFormsJudge.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

整棵建出、替换 `=` 之后的全部 raw 单元（实现见 `CompositeInitializerFormsJudge.Build`）。

```ts
return CompositeInitializerFormsJudge.Build(host, context);
```
