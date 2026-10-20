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

# class ObjectBindingPatternShape extends ShapeToken

```txt
const { a } = o;
const { a: b } = o;
```

## field Elements:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>ObjectBindingPatternShape

```ts
// `{ a, b: c }`：与 ArrayBindingPatternShape.FromBracket 同构——结构由括号承载，逗号不进 AST。
// 元素在单元层一样是「名字 / 名字:名字 / ...名字」，区别只在元素内部怎么解释（见 BindingElementShape.FromTokens）。
// computed name（`{ [k]: a }`）依赖类型家族的 ComputedPropertyNameShape，本块不越界（见 docs/coverage-members.md）。
const shape = new ObjectBindingPatternShape(bracket.Template);
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
for (const item of shape.Elements) {
  shape.Add(item);
}
shape.SignInToken(bracket);
shape.SignOutToken(bracket);
shape.TryToClose(context);
return shape;
```
