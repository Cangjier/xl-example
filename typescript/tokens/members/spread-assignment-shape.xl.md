# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class SpreadAssignmentShape extends ShapeToken

```txt
let o = { ...p };
```

## field DotDotDot:Token | null = null

## field Expression:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromExpression:(dotDotDot:Token, expression:Token, context:SyntaxContext)=>SpreadAssignmentShape

```ts
// TS 的 SpreadAssignment 只有一个子节点（被展开的表达式），`...` 不是节点，但区间**从 `...` 起**：
// pos/end 覆盖 `...p` 整段，而不是只覆盖 p。`...` 目前由 punctuation 家族的 DotDotDotToken
// 或三个 `Symbol` 点表示，宿主把那一颗单元当 dotDotDot 传进来（它只参与区间，不进 Data）。
const shape = new SpreadAssignmentShape(expression.Template);
shape.DotDotDot = dotDotDot;
shape.Expression = expression;
shape.Add(expression);
shape.SignInToken(dotDotDot);
shape.SignOutToken(expression);
shape.TryToClose(context);
return shape;
```
