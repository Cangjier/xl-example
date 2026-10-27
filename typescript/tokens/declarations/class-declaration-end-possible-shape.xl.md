# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
