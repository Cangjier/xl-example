# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
```

# namespace cangjie

# class ExpressionStatementShape extends ShapeToken

```txt
a = 1;
f();
"use strict";
a.b.c;
new C();
```

## field Expression:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromUnits:(host:Token, start:int, tokenIndex:int, context:SyntaxContext, requireSemicolon?:bool)=>ExpressionStatementShape

`requireSemicolon` 缺省为 `true`；终结候选在文件末尾（EOF）建最后一条语句时传 `false`，此时最后一个代码单元就是表达式的末尾，不再要求 `Symbol ";"`。

```ts
const code:Array<Token> = [];
for (let at = start; at <= tokenIndex; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
const hasSemicolon = requireSemicolon ?? true;
const last = code[code.length - 1];
let expressionUnits:Array<Token> = code;
if (hasSemicolon) {
  if (code.length < 2) {
    throw new Error("表达式语句缺少表达式或分号");
  }
  if (!(last instanceof Symbol) || !(last as Symbol).Is(";")) {
    throw new Error("表达式语句缺少分号");
  }
  expressionUnits = code.slice(0, code.length - 1);
} else if (code.length < 1) {
  throw new Error("表达式语句缺少表达式");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.EndIndex;
    if (end >= 0) {
      pos = end;
    }
    break;
  }
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(expressionUnits, pos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("表达式语句没有读完");
}
const shape = new ExpressionStatementShape(host.Template);
shape.Expression = expression;
shape.Add(expression);
const head = code[0];
if (head.SourceRange.Start !== null) {
  shape.SignIn(head.SourceRange.Start);
}
if (last.SourceRange.End !== null) {
  shape.SignOut(last.SourceRange.End);
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const kept:Array<Token> = [];
for (const item of this.Data) {
  if (!item.IsBasicToken) {
    kept.push(item);
  }
}
this.Data = kept;
for (const item of this.Data) {
  item.Parent = this;
}
return CloseStates.Nothing;
```
