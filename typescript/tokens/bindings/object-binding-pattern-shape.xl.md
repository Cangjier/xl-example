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
const { a = 1 } = o;
```

`{...}` 对象绑定模式：与 `ArrayBindingPatternShape` 同构——结构由括号承载，逗号不进 AST；
元素一律交给 `BindingElementShape.FromTokens`（`a` / `a: b` / `a = 1` / `...a` 都在那里建）。

## field Elements:Array<Token> = []

**本块固定留空**：理由与 `ArrayBindingPatternShape.Elements` 完全相同——元素直接 `Add` 进 `Data`，
`statement-builder` 的旧 `NormalizeBindingPattern` 会按 `Elements` 重写 `Data`；留空即让它成为 no-op。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>ObjectBindingPatternShape

```ts
const shape = new ObjectBindingPatternShape(bracket.Template);
const groups:Array<Array<Token>> = [];
const positions:Array<number> = [];
let group:Array<Token> = [];
let groupPos = bracket.SourceRange.Start === null ? 0 : bracket.SourceRange.Start.Index + 1;
for (const item of bracket.Data) {
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Symbol && (item as Symbol).Is(",")) {
    groups.push(group);
    positions.push(groupPos);
    group = [];
    groupPos = item.SourceRange.End === null ? groupPos : item.SourceRange.End.Index + 1;
    continue;
  }
  group.push(item);
}
groups.push(group);
positions.push(groupPos);
for (let at = 0; at < groups.length; at++) {
  const tokens = groups[at];
  if (tokens.length === 0) {
    // 对象模式的行尾逗号（`{ a, }`）与空模式 `{}` 都不是元素。
    continue;
  }
  const element = BindingElementShape.FromTokens(tokens, context, positions[at]);
  if (element !== null) {
    shape.Add(element);
  }
}
shape.SignInToken(bracket);
shape.SignOutToken(bracket);
shape.TryToClose(context);
return shape;
```
