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

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>AbstractKeywordShape

```ts
// 区间就是 `abstract` 这一个词；Pos 由宿主按「含前导 trivia」的口径重设（与 DeclareKeywordShape 相同）。
const shape = new AbstractKeywordShape(token.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Pos = token.SourceRange.Start;
shape.TryToClose(context);
return shape;
```
