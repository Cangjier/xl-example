# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { MemberChainJudge } from "../postfix/member-chain-judge.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

WP-P3b：声明初始化器位置的 **`delete` 表达式**（`let x = delete o.p`）的**一条候选**。

`++` / `--` 不在本文件（同目录的 `update-expression-possible-shape.xl.md`）；`typeof` / `void` / `-` / `+` / `!` / `~`
归 WP-P3a 的 `prefix-unary-possible-shape.xl.md`——**本 WP 一行不动那个文件**（与 P3c 的文件所有权不重叠）。

**legacy EOF 口径（`typescript/cases/tts/tools/expr-probe.mjs --legacy --eof-only` 实测，逐字照抄）**

```text
let x = delete o.p
VariableDeclarationShape  pos=3  src=[4,18)
├─ IdentifierShape  pos=3  src=[4,5)  text="x"
└─ DeleteExpressionShape  pos=7  src=[8,18)
   └─ PropertyAccessExpressionShape  pos=14  src=[15,18)
      ├─ IdentifierShape  pos=14  src=[15,16)  text="o"
      └─ IdentifierShape  pos=17  src=[17,18)  text="p"
```

三条硬口径：① `DeleteExpressionShape` 下**只有操作数一个子节点**——`delete` 关键字本身不进 `Data`
（`OperatorShapeMap.CreatePrefix` 对 `delete` 返回的就是这个表达式节点）；② 操作数是**成员链**
（`o.p` 的 `PropertyAccessExpressionShape` 由 legacy `ExpressionBuilder` 的 postfix 循环给出，P1 已合并）；
③ `Pos` 一律是 legacy `ExpressionBuilder.Load` 的 `Positions[0]`（= `=` 的 `EndIndex` 7），
成员链节点的 `Pos` 由同一个建造器给出（14）。

**为什么整棵交给 legacy 建造器（与 P1 `MemberChainJudge.Build`、本 WP 的 update 候选同一套惯用法）**

`delete` 的建树入口在 `ExpressionBuilder.ParseUnary`（`text === "delete"` → `new DeleteExpressionShape`，
`shape.Add(operand)`，`SpanNode` 给 `src` / `Pos`）。本候选只决定「哪一格算长完」：`IsInitializerEnd` 成立那一格
把 `=` 之后的全部 raw 单元交给同一个建造器整棵建出、原位替换 ⇒ 类名 / 层级 / `Pos` / 子节点与 legacy EOF
逐节点同源。**没有**新建 `delete` 语法形状——`DeleteExpressionShape` legacy 已有，直接复用。

**为什么要认领 `.` 那一格**：`unary-delete` 现在抛的正是 `declaration 符号 .`
（`VariableDeclarationEndPossibleShape` 的 `Symbol` 分支，`steps=18`）。认领的语义是「继续等」
（`ContinuationClaim` 为真 ⇒ `endPossible` 返回 `Reject` ⇒ 不抛错、也不收口），表达式继续在
`o` 之后的成员链上长，长完那一格再由本候选建树。**不认领 `delete` 关键字那一格**：`delete` 是 `Common`，
`endPossible` 的 `ContinuationClaim` 只对 `Symbol` / `Bracket` 格被问，那一格本来就不抛错。

**同格互斥（`CatalogGuide` 只在 `Candidates.size === 1` 时建树）**

- `delete` 关键字格：`IdentifierPrimaryPossibleShape` 对 `delete` 也 `Accept`（它只排除
  `true`/`false`/`null`/`this`/`new`/`in`/`instanceof`），但它 `IsBuildable` 为假
  （`PrimaryAtomGuard.IsTerminalAfter` 看不完操作数）⇒ 两个候选并存 = `Waiting`，不会提前建裸标识符；
- 操作数 `o` 格：`IdentifierPrimaryPossibleShape` 仍 `Accept`（同样不可建）⇒ 继续 `Waiting`；
  P1 的六个候选只在自己的**链头**格上活（`MemberChainJudge.Kind` 的链头是 `delete`，
  `HeadAllowed` 因 `PrefixKeywords` 里的 `delete` 而判死）⇒ 它们 `Reject`；
- `.` 格：`IdentifierPrimaryPossibleShape` 在符号格上 `Reject` 退场；P1 六个候选因为族为空也 `Reject`
  ⇒ 只剩本候选，但这一格 `IsInitializerEnd` 为假（后面还有 `p`）⇒ 只等不建；
- `p` 格：只剩本候选且整条链长完 ⇒ 建树。

`delete` 之后**不是**成员链的形态（`delete f()` / `delete a + b`）本候选也照样整棵交给建造器：
建造器吃得下就是 legacy 同源树，吃不下（`At !== Units.length`）`CanBuild` 返回 `false`、
候选继续等 ⇒ EOF 收口走原来的显式抛错 / `partial`，不会静默产半棵树（C10）。

# class DeletePossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后追加一行，`// [P3b]`）。只追加自己这一个新实例。

```ts
shapes.push(new DeletePossibleShape());
```

## static field KindDelete:string = "delete"

本候选的族名（唯一一族：`delete` 表达式）。

## static method IsDeleteHead:(unit:Token)=>bool

链头是不是 `delete` 关键字（`Common` 文本）。

```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "delete";
```

## static method Kind:(units:Array<Token>)=>string

`=` 之后的初始化器是不是 `delete` 表达式：链头是 `delete` ⇒ `"delete"`，否则 `""`。

只认 `=` 之后**第一个代码单元**：`let x = f(delete o.p)` / `delete` 在别处的形态不在本候选范围
（族为空 ⇒ `Reject` ⇒ 原来的显式抛错 / `partial` 原样保留，账本零漂移）。

```ts
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return "";
}
if (!DeletePossibleShape.IsDeleteHead(units[headAt])) {
  return "";
}
return DeletePossibleShape.KindDelete;
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

「这条 `delete` 表达式已经长完、可以整棵建出」：族命中 + `delete` 之后至少还有一个代码单元（操作数）
+ 最后一个代码单元之后只剩输入结束（或 `;`）+ legacy `ExpressionBuilder` 能整段吃完。

`delete` 那一格、`o` 那一格、`.` 那一格 `IsInitializerEnd` 都为假（后面还有代码），所以这里不会在半截上建树。

```ts
if (DeletePossibleShape.Kind(units) === "") {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return false;
}
const operandAt = MemberChainJudge.FirstSignificant(units, headAt + 1);
if (operandAt < 0) {
  return false;
}
const last = MemberChainJudge.LastSignificant(units);
if (last <= operandAt) {
  return false;
}
// [D0:TAIL] 「之后只剩输入结束」的唯一判据（跳过 trivia、允许 `;`）。
if (!InitializerTailJudge.IsInitializerEnd(units, last)) {
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

- 越界 / trivia ⇒ `Uncertain`（`Reject` 是永久的：trivia 格不能判死）；
- 扫描下界走 `ItemUtil.ItemStartCached`（C8）；
- `=` ⇒ `Uncertain`（初始化器还没开始）；
- 族命中（`delete` 链头）⇒ `Uncertain`（活着；建不建由 `IsBuildable` 的收口判据决定）；
- 其余 ⇒ `Reject`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
if (DeletePossibleShape.Kind(units) !== "") {
  return ShapeStates.Uncertain;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只在「整条 `delete` 表达式长完」的那一格放行，判据唯一：`CanBuild`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return DeletePossibleShape.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `=` 之后的**全部** raw 单元整棵交给 legacy 建造器：`delete` 得 `DeleteExpressionShape`，
操作数按成员链 / 一元规则建出（C10：先校验再动手）。建完 `host.MountedUnit = null`：后续单元仍归声明层。

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：expression delete 缺赋值符");
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
if (raw.length === 0) {
  throw new Error("增量变量形状未支持：expression delete 没有操作数");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression delete 未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

`endPossible` 的放行判据：**只认成员链的后缀格（`.` / `?.` / `!` / `[`），且族是 `delete`**。

认领的语义是「继续等」。族不命中一律 `false`：`delete` 之外的 `.`（`ref-nonnull` / `ref-optional` 等）
仍由 P1 各自的候选认领，`delete` 之外没有认领的符号格照旧显式抛错（C10）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (DeletePossibleShape.Kind(units) !== DeletePossibleShape.KindDelete) {
  return false;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "!";
}
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "[";
}
return false;
```
