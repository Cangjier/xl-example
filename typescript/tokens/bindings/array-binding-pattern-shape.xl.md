# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { OmittedExpressionShape } from "../expressions/omitted-expression-shape.xl.md"
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
const [a, , b] = xs;
```

## field Elements:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>ArrayBindingPatternShape

```ts
const shape = new ArrayBindingPatternShape(bracket.Template);
const groups:Array<Array<Token>> = [];
const positions:Array<number> = [];
let group:Array<Token> = [];
let groupPos = bracket.SourceRange.StartIndex < 0 ? 0 : bracket.SourceRange.StartIndex + 1;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    groups.push(group);
    positions.push(groupPos);
    group = [];
    groupPos = item.SourceRange.EndIndex < 0 ? groupPos : item.SourceRange.EndIndex;
    continue;
  }
  group.push(item);
}
groups.push(group);
positions.push(groupPos);
for (let at = 0; at < groups.length; at++) {
  const tokens = groups[at];
  const position = positions[at];
  if (tokens.length > 0) {
    const element = BindingElementShape.FromTokens(tokens, context, position);
    if (element !== null) {
      shape.Add(element);
    }
    continue;
  }
  if (at === groups.length - 1) {
    // 行尾逗号（`[a,]`）不是空位；空模式 `[]` 也走这里。
    continue;
  }
  const reference = bracket.SourceRange;
  if (reference.StartIndex < 0 || reference.Document === null || position <= 0) {
    continue;
  }
  // 空位是零宽节点：TS 的 OmittedExpression pos == end == position；
  // cjAst 的 end = SourceRange.EndIndex，所以 End 取 position（半开区间 `[position-1, position)`）。
  const omitted = new OmittedExpressionShape(bracket.Template);
  omitted.SourceRange.Document = reference.Document;
  omitted.SourceRange.Start = position - 1;
  omitted.SourceRange.End = position;
  omitted.Pos = position;
  omitted.TryToClose(context);
  shape.Add(omitted);
}
shape.SignInToken(bracket);
shape.SignOutToken(bracket);
shape.TryToClose(context);
return shape;
```
