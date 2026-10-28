# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

```text
let x = { a: 1 }        → ObjectLiteralExpressionShape
let x = { ...a }        → ObjectLiteralExpressionShape + SpreadAssignmentShape
let x = { [k]: 1 }      → ObjectLiteralExpressionShape + ComputedPropertyName
let x = { m() {} }      → ObjectLiteralExpressionShape + MethodDeclaration
let x = { get a() {} } / { set a(v) {} } → ObjectLiteralExpressionShape + Get/SetAccessor
```

# class CompositeInitializerJudge

## static method EqualIndex:(units:Array<Token>)=>int

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method SoleCompositeUnit:(units:Array<Token>)=>Token | null

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return null;
}
let sole:Token | null = null;
for (let at = equalAt + 1; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (sole !== null) {
    return null;
  }
  sole = unit;
}
if (sole === null || !(sole instanceof Bracket)) {
  return null;
}
// 阶段口径只接管 `{...}`：`[...]` 与 `let x = [1] as const` 在「`]` 关闭」这一格无法区分
// 「初始化器到此结束」与「后面还有后缀代码（`as` / `.` / `+` …）」，提前建树会把后缀单元
// 留在声明层被静默丢弃（divergent）。数组形态等 E-base 提供「括号内候选回调」后再做逐元素增量，
// 交接见 `_coord/REPORT-all-possible-A4.md`。
const start = (sole as Bracket).StartBracketChar;
if (start !== "{") {
  return null;
}
return sole;
```

## static method Claims:(units:Array<Token>)=>bool

```ts
const sole = CompositeInitializerJudge.SoleCompositeUnit(units);
if (sole === null) {
  return false;
}
let last = -1;
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    last = at;
    break;
  }
}
if (last < 0) {
  return false;
}
return InitializerTailJudge.IsInitializerEnd(units, last);
```

## static method Build:(host:Token, context:SyntaxContext)=>Token

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 复合初始化器缺赋值符");
}
const equalUnit = host.Data[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const raw:Array<Token> = host.Data.slice(equalAt + 1);
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：declaration 初始化器未读完");
}
const bracket = CompositeInitializerJudge.SoleCompositeUnit(host.Data);
if (bracket === null) {
  throw new Error("增量变量形状未支持：declaration 复合初始化器");
}
const built = (bracket as Token).Replace(expression);
built.Parent = host;
// 后续单元（`;` / `,` / `as` …）仍属于声明层：不把它们吸进已建好的表达式形状。
host.MountedUnit = null;
return built;
```
