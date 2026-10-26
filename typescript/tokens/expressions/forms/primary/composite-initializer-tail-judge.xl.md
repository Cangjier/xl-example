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
```

# namespace cangjie

# class CompositeInitializerTailJudge

WP-A4c 的**尾形判据**：`<T>y`（尖括号断言）与 `[1] as const`（数组 + `as` 断言）。

A4b 的两个闸门（`Family` 形态 / `CanBuild` 完成）在两种形态上还差一步：

1. **尖括号断言 / 泛型箭头**：`=` 之后第一个单元是 `Symbol("<")`，而 A4b 的 `Family` 不认识它（返回 `""`），
   于是终结候选在 `<` 那一格按 C10 抛「declaration 符号 <」。本判据把 `<` 起首认领为 `"angle"`：
   后面接的是**前缀类型 + 表达式**（`<T>y` / `<number>y`）或**类型参数表 + 箭头**（`<T>(a: T) => a`），
   两者都由 legacy `ExpressionBuilder.ParseExpression` 整棵建出（类名 / 层级 / `Pos` 与 legacy 同源）。
2. **`[1] as const`**：`]` 关闭后还有 `as` 续接，A4b 的完成闸门判「还没长完」是对的，但它同时把 `array` 族
   留在候选里（`Accept`），真实的 `[1] as const` 由 A5 的 as 断言路径负责——两边会同时存活、建不出来。
   本判据要求 **A4b 的 `Family` 对「`]` 之后紧跟 `as`/`satisfies`」返回 `""`**（A4b 文件里已加这条排除），
   由本判据认领为 `"as-assert"`，在**整条 `X as T` 长完**那一格整棵建出（同样走 legacy `ExpressionBuilder`）。

两族都是「第一个单元决定族 + legacy 建造器整段吃完 + 之后只剩输入结束」，与 A4b 的完成闸门同一口径。

## static method Family:(units:Array<Token>)=>string

`=` 之后第一个代码单元决定的族；不是本判据的形态返回 `""`。

- `"angle"`：第一个代码单元是 `Symbol("<")`（尖括号断言 / 泛型箭头）；
- `"as-assert"`：第一个代码单元是 `[` 括号，且 `]` 之后（文档前瞻）紧跟 `as` / `satisfies`。

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

终结候选的放行判据（**没有** context / template 的 `ComputeByIndex` 里用）：族命中、且还没到「整条长完」的
那一格时**继续等**（`Reject`），不要按 C10 抛。族命中即返回 `true`（完成性由 `CanBuild` 在候选的
`IsBuildable` 里判，两者共用 `Family`/`CanBuild`，不两处漂移）。

```ts
return CompositeInitializerTailJudge.Family(units) !== "";
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

「整条初始化器已经长完、可以整棵建出」：族命中 + legacy `ExpressionBuilder` 整段吃完 + 之后只剩输入结束。

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
if (CompositeInitializerFormsJudge.NextSignificantChar(units[last]) !== "") {
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

把 `=` 之后的全部 raw 单元整棵建成表达式并替换（与 A4b 的 `Build` 同一手法：legacy 建造器给出
`Pos`/层级/子节点，建完 `host.MountedUnit = null`）。

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
