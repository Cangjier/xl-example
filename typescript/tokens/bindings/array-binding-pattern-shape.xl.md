# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BindingElementShape } from "./binding-element-shape.xl.md"
```

# namespace cangjie

# class ArrayBindingPatternShape extends ShapeToken

```txt
const [a] = xs;
const [a, b] = xs;
```

## field Elements:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>ArrayBindingPatternShape

```ts
// `[a, b]`：结构由括号承载，逗号不进 AST，逐个元素建 BindingElementShape。
// TS 的 ArrayBindingPattern 子节点是 BindingElement 或 OmittedExpression（`[a, , b]` 里的空位）；
// **空位暂时跳过**：OmittedExpressionShape 在 expressions 家族，本块不越界去建它（见 docs/coverage-members.md）。
const shape = new ArrayBindingPatternShape(bracket.Template);
let group:Array<Token> = [];
let pos = bracket.SourceRange.Start === null ? -1 : bracket.SourceRange.Start.Index + 1;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    const element = BindingElementShape.FromTokens(group, context, pos);
    if (element !== null) {
      shape.Elements.push(element);
    }
    group = [];
    pos = item.SourceRange.End === null ? -1 : item.SourceRange.End.Index + 1;
    continue;
  }
  group.push(item);
}
const tail = BindingElementShape.FromTokens(group, context, pos);
if (tail !== null) {
  shape.Elements.push(tail);
}
for (const element of shape.Elements) {
  shape.Add(element);
}
shape.SignInToken(bracket);
shape.SignOutToken(bracket);
shape.TryToClose(context);
return shape;
```
