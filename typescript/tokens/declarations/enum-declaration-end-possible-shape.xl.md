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
import { EnumDeclarationShape } from "./enum-declaration-shape.xl.md"
```

# namespace cangjie

# class EnumDeclarationEndPossibleShape extends PossibleShape

```txt
enum E { A }
           ^ 枚举声明在这里结束
```

提前挂载的枚举声明壳的终结候选：枚举体括号一闭合就 `Accept`，`BuildByIndex` 把「壳」换成完整的 `EnumDeclarationShape`。

壳的目录向导**只会在枚举体括号创建之后才装上**（见 `EnumDeclarationShape.OnBracketCreatedEvent`），所以这里的判定可以只看「当前格是不是一个已闭合的 `{` 括号」：头部阶段（`declare` / `const` / 装饰器 / 名字）根本没有向导，枚举体里的嵌套括号父级是枚举体，不会回到壳。

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

把壳收口成完整形状：用壳的 `Data`（头部代码单元 + 已闭合的枚举体括号）走 `BuildFromCode`，然后在父单元的 `Data` 里原地顶替掉壳。

壳的 `Pos` 在建壳时已经按「前一个非 trivia 单元的 `EndIndex`」算好，直接沿用——收口时父单元里壳已经是最后一个单元，重算会得到壳自己的右边界。

```ts
const shell = host as EnumDeclarationShape;
const code:Array<Token> = [];
for (const unit of shell.Data) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
const built = EnumDeclarationShape.BuildFromCode(shell, code, shell.Pos, context);
const parent = shell.Parent;
if (parent !== null) {
  BodyGuideUtil.FinishShell(parent, shell, built);
}
return built;
```
