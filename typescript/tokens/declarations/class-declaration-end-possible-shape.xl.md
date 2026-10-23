# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { ClassDeclarationShape } from "./class-declaration-shape.xl.md"
```

# namespace cangjie

# class ClassDeclarationEndPossibleShape extends PossibleShape

```txt
class C { a = 1 }
                  ^ 类声明在这里结束
```

提前挂载的类声明壳的终结候选：类体括号一闭合就 `Accept`，`BuildByIndex` 把「壳」换成完整的 `ClassDeclarationShape`。

壳的目录向导**只会在类体括号创建之后才装上**（见 `ClassDeclarationShape.OnBracketCreatedEvent`），所以这里的判定
可以只看「当前格是不是一个已闭合的 `{` 括号」：头部里的类型字面量括号（heritage 泛型实参里的 `{…}`）在向导装上
之前就已经关完了，不会走到这里。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{" && (unit as Bracket).Closed) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把壳收口成完整形状：用壳的 `Data`（头部代码单元 + 已闭合的类体括号）走 `BuildFromCode`，然后在父单元的 `Data` 里
原地顶替掉壳（`BodyGuideUtil.FinishShell`，会一并清掉 `MountedUnit`）。

壳的 `Pos` 在建壳时已经按「前一个非 trivia 单元的 `EndIndex`」算好，直接沿用——收口时父单元里壳已经是最后
一个单元，重算会得到壳自己的右边界。

`BuildFromCode` 的 `allowAnonymous` 传 `true`：壳可能是匿名的（`class {}` / `class<T> {}` / `class extends A {}` 在
TS 里都是匿名的 `ClassDeclaration`，静默恢复）。

```ts
const shell = host as ClassDeclarationShape;
const code:Array<Token> = [];
for (const unit of shell.Data) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
const built = ClassDeclarationShape.BuildFromCode(shell, code, shell.Pos, context, true);
// 传 `host`（收口时就是壳本身）：`FinishShell` 对 `host === shell` 有明确容错，内部改取 `shell.Parent`。
// 这样也避开「壳没挂上（Parent 为 null）」时的类型问题，父单元为空时 util 自己什么都不做。
BodyGuideUtil.FinishShell(host, shell, built);
return built;
```
