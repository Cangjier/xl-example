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

`[...]` 数组绑定模式：结构由括号承载，逗号不进 AST，逐个元素建 `BindingElementShape`；
空位（`[a, , b]` / `[, a]`）建零宽的 `OmittedExpressionShape`（TS 的 `ArrayBindingPattern` children 里有它）。

## field Elements:Array<Token> = []

**本块固定留空**：元素直接 `Add` 进 `Data`（AST 只读 `Data`）。`statement-builder` 里旧的
`NormalizeBindingPattern` workaround 会按 `Elements` 逐组重写 `Data`（只留 Common token），
`Elements` 为空时它在第一个非空组就 `break`，等于 no-op —— 这样 statements 家族不用改一行，
真正正确的子节点也不会被它覆盖。待 statements 家族删掉那条 workaround 后，可把本字段回填。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBracket:(bracket:Bracket, context:SyntaxContext)=>ArrayBindingPatternShape

按 `,` 切组：每组交给 `BindingElementShape.FromTokens`（嵌套 pattern / 默认值 / rest 都在里面建）；
组位置 = 前一个非 trivia 单元 `End+1`（第一个组是 `[` 之后），与 TS 的 `pos` 同口径。

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
