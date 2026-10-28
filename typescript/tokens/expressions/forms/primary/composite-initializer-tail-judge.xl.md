# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { CompositeInitializerFormsJudge } from "./composite-initializer-forms-judge.xl.md"
import { CompositeInitializerJudge } from "./composite-initializer-judge.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

# class CompositeInitializerTailJudge

## static method Family:(units:Array<Token>)=>string

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const first = CompositeInitializerFormsJudge.FirstSignificant(units, equalAt + 1);
if (first < 0) {
  return "";
}
const head = units[first];
if (head instanceof Symbol) {
  if ((head as Symbol).Is("<")) {
    return "angle";
  }
  return "";
}
if (!(head instanceof Bracket) || (head as Bracket).StartBracketChar !== "[") {
  return "";
}
if (CompositeInitializerFormsJudge.HasAssertSuffix(units, equalAt)) {
  return "as-assert";
}
return "";
```

## static method CanWait:(units:Array<Token>)=>bool

```ts
return CompositeInitializerTailJudge.Family(units) !== "";
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

```ts
if (CompositeInitializerTailJudge.Family(units) === "") {
  return false;
}
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const last = CompositeInitializerFormsJudge.LastSignificant(units);
if (last <= equalAt) {
  return false;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  raw.push(units[at]);
}
if (raw.length === 0) {
  return false;
}
// [D0:TAIL] 尾巴判据统一走 `InitializerTailJudge.IsInitializerEnd`（跳过 trivia、允许一个或多个 `;`、
// 之后必须输入结束），不再各处各写一份 `NextSignificantChar === ""`。
if (!InitializerTailJudge.IsInitializerEnd(units, last)) {
  return false;
}
const equalUnit = units[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const builder = new ExpressionBuilder(template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
```

## static method Build:(host:Token, context:SyntaxContext)=>Token

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 尾形初始化器缺赋值符");
}
const equalUnit = host.Data[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < host.Data.length; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  raw.push(host.Data[at]);
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：declaration 初始化器未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```
