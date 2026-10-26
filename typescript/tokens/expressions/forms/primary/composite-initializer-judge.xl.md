# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
```

# namespace cangjie

WP-A4 的**复合初始化器判据**（本变更范围：对象字面量族，`{...}`）。

支持的形态（都是「初始化器 = 单个 `{...}` 括号」的那一类）：

```text
let x = { a: 1 }        → ObjectLiteralExpressionShape
let x = { ...a }        → ObjectLiteralExpressionShape + SpreadAssignmentShape
let x = { [k]: 1 }      → ObjectLiteralExpressionShape + ComputedPropertyName
let x = { m() {} }      → ObjectLiteralExpressionShape + MethodDeclaration
let x = { get a() {} } / { set a(v) {} } → ObjectLiteralExpressionShape + Get/SetAccessor
```

**数组 `[...]` 不在本变更范围**（交接见 `_coord/REPORT-all-possible-A4.md`）：`let x = [1] as const`
在「`]` 关闭」那一格与 `let x = [1, 2]` 无法区分——提前建树会把 `as const` 留在声明层被静默丢弃
（divergent）。数组形态要么等 A5/Leader 提供「括号关闭后仍有后缀代码则回退」的判据，要么等 E-base
提供括号内候选回调后按元素增量实现。

**为什么在「括号关闭」这一格建整棵子树**（阶段口径，写进 `_coord/REPORT-all-possible-A4.md`）：
`Bracket` 是 basic token 且自己就是 `Data` 宿主，括号内容不会作为单元流到声明层——声明层的候选只能看到
**整只括号**这一个单元。所以本阶段的复合字面量在括号关闭那一格整棵建出（用 legacy 同一个
`ExpressionBuilder.ParseExpression`，类名 / 层级 / `Pos` 因此逐位相同），比 legacy 的「语句收口时建」
严格更早，账本判 `incremental`。括号内部的逐元素增量需要 core 提供「括号内候选回调」，不在本 WP 范围。

# class CompositeInitializerJudge

判据与建树的唯一实现，候选与声明终结候选（`variable-declaration-end-possible-shape.xl.md`）共用。

## static method EqualIndex:(units:Array<Token>)=>int

宿主 `Data` 里 `Symbol("=")` 的下标；没有返回 `-1`。跳过前导 trivia（`= ` 之前的空白）。

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

`=` 之后（跳过 trivia）**恰好一个**代码单元、且它是 `[...]` 或 `{...}` 的 `Bracket` 时返回它；否则 `null`。

判据只看「剩下的是不是只有这一只括号」：还有别的代码单元（`as` / `+` / `;` / `,` …）就说明这不是
「初始化器 = 单只括号」形态，本 WP 不接管（交给对应 WP，并保持原有显式 throw）。

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

本 WP 是否接管这份初始化器（`SoleCompositeUnit !== null`）。终结候选用它决定「等」还是「显式拒绝」。

```ts
return CompositeInitializerJudge.SoleCompositeUnit(units) !== null;
```

## static method Build:(host:Token, context:SyntaxContext)=>Token

把 `=` 之后那只括号整棵建成表达式形状，并**原位替换**括号自己（位置不变）。

用的是 legacy 的同一个入口 `ExpressionBuilder.ParseExpression`（`ParsePrimary` 内部再分派到
`ParseArrayLiteral` / `ParseObjectLiteral`），因此建出来的节点类名、子节点顺序、`Pos` 与 legacy 逐位相同；
`Positions` 的第一格取 `=` 的 `EndIndex`（C1：前一个非 trivia 单元的终点），与 `FinishIncremental` 的
降级分支同一口径。

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
