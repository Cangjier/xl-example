# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { InterfaceDeclarationShape } from "./interface-declaration-shape.xl.md"
```

# namespace cangjie

# class InterfaceDeclarationEndPossibleShape extends PossibleShape

```txt
interface I { a: number; }
                          ^ 接口声明在这里结束
```

提前挂载的接口声明壳的终结候选：接口体括号一闭合就 `Accept`，`BuildByIndex` 把「壳」换成完整的 `InterfaceDeclarationShape`。

壳的目录向导**只会在接口体括号创建之后才装上**（见 `InterfaceDeclarationShape.OnBracketCreatedEvent`），所以这里的判定可以只看「当前格是不是一个已闭合的 `{` 括号」：头部里的类型字面量括号在向导装上之前就已经关完了，不会走到这里。

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

把壳收口成完整形状：用壳的 `Data`（头部代码单元 + 已闭合的接口体括号）走 `BuildFromCode`，然后在父单元的 `Data` 里原地顶替掉壳。

壳的 `Pos` 在建壳时已经按「前一个非 trivia 单元的 `End.Index + 1`」算好，直接沿用——收口时父单元里壳已经是最后一个单元，重算会得到壳自己的右边界。

```ts
const shell = host as InterfaceDeclarationShape;
const code:Array<Token> = [];
for (const unit of shell.Data) {
  if (!unit.IsTriviaToken) {
    code.push(unit);
  }
}
const built = InterfaceDeclarationShape.BuildFromCode(shell, code, shell.Pos, context);
const parent = shell.Parent;
if (parent !== null) {
  const at = parent.Data.indexOf(shell);
  if (at >= 0) {
    parent.Data.splice(at, 1, built);
  }
  built.Parent = parent;
  if (parent.MountedUnit === shell) {
    parent.MountedUnit = null;
  }
}
return built;
```
