# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class AbstractKeywordShape extends ShapeToken

```txt
abstract class C {}
```

`abstract` 是 modifier，会作为 ClassDeclaration 的子节点出现。TS 的 SyntaxKind 反查把它印成
`FirstContextualKeyword`（同一个枚举值被后一个名字覆盖），harness 的 `TS_KIND_ALIASES` 里有一条
`["FirstContextualKeyword","AbstractKeyword"]` 把它归一到本形状的类名口径。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>AbstractKeywordShape

```ts
// 区间就是 `abstract` 这一个词；Pos 由宿主按「含前导 trivia」的口径重设（与 DeclareKeywordShape 相同）。
const shape = new AbstractKeywordShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.Pos = token.SourceRange.Start !== null ? token.SourceRange.Start.Index : -1;
shape.TryToClose(context);
return shape;
```
