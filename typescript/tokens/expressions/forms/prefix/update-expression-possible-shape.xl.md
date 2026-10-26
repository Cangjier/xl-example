# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
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

WP-P3b：声明初始化器位置的 **update 表达式**（`++` / `--`，前缀与后缀两种位置）的**一条候选**。

`delete` 不在本文件（`delete-possible-shape.xl.md`，同一个 `forms/prefix/` 目录、另一个文件）；
`-` `+` `!` `~` `typeof` `void` 归 WP-P3a 的 `prefix-unary-possible-shape.xl.md`（本文件一行不动它）。
`asi-postfix-newline` 的语句位 `a⑉++b` 归 D1，不在本候选范围（本候选只在 `=` 之后的初始化器里工作）。

**legacy EOF 口径（`typescript/cases/tts/tools/expr-probe.mjs --legacy --eof-only` 实测，逐字照抄）**

```text
let x = y++                     let x = ++y
VariableDeclarationShape        VariableDeclarationShape
├─ IdentifierShape pos=3       ├─ IdentifierShape pos=3
└─ PostfixUnaryExpressionShape └─ PrefixUnaryExpressionShape
   pos=7  src=[8,11)              pos=7  src=[8,11)
   └─ IdentifierShape             └─ IdentifierShape
      pos=7  src=[8,9)  text="y"     pos=10  src=[10,11)  text="y"
```

三条硬口径：① `++` / `--` 在两个位置都是**表达式节点**，节点下**只有操作数一个子节点**——运算符符号本身
不进 `Data`，也没有 `op=`（与 P3a 记录的前缀一元同一口径）；② 类名由位置决定：前缀位是
`PrefixUnaryExpressionShape`，后缀位是 `PostfixUnaryExpressionShape`，两者都**不能**手拼，
必须由 legacy 建造器给出；③ `Pos` 一律是 legacy `ExpressionBuilder.Load` 的 `Positions[i]`
（= 前一个非 trivia 单元的 `EndIndex`，后缀位的**操作数**因此与父节点同 `Pos`=7，前缀位的操作数是 10）。

**为什么整棵交给 legacy 建造器（与 P1 `MemberChainJudge.Build` 同一套惯用法）**

`++` / `--` 的建树入口在 `ExpressionBuilder` 的两处：前缀走 `ParseUnary`（`OperatorShapeMap.CreatePrefix`
对 `++` / `--` 返回 `PrefixUnaryExpressionShape`），后缀走 `ParsePostfixSuffix`（返回
`PostfixUnaryExpressionShape`）。本候选**只决定「哪一格算长完」**，长完那一格把 `=` 之后的全部 raw 单元
交给同一个建造器整棵建出、原位替换——类名 / 层级 / `Pos` / `src` / 子节点因此与 legacy EOF 逐节点同源，
不存在手拼形状的漂移面。

**两个位置各自的「长完」格（这就是增量的那一拍）**

- 前缀 `++y`：`++` 符号格到达时**还没有操作数**（`IsInitializerEnd` 为假），所以只活着等；操作数 `y`
  关闭那一格 `++y` 已经长完 ⇒ 在**操作数格**建。
- 后缀 `y++`：`y` 关闭那一格 `++` 还没到（`IsInitializerEnd` 为假），只活着等；`++` 关闭那一格长完
  ⇒ 在**运算符格**建。
  两个位置共用同一条判据 `CanBuild`（族命中 + 最后一个代码单元之后只剩输入结束 + legacy 建造器能整段吃完），
  所以「提前建半截」在结构上不可能发生。

**为什么要看文档前瞻才能在后缀的操作数格上活着（实测约束，不是保险）**

`let x = y++` 的 `y` 关闭时 `++` 尚未流进宿主的 `Data`，族判据只看单元数组会得到空串 ⇒ 本候选 `Reject`
（`Reject` 在本条目内**永不回来**）。而这一格上 `IdentifierPrimaryPossibleShape` 也 `Accept`：若本候选退场，
它就成了唯一候选，而 `PrimaryAtomGuard.ContinuationChars` 里恰好有 `+` ⇒ 它会把 `y` 提前物化成裸
`IdentifierShape`，后面 `++` 那一格再没有候选能消费 ⇒ `partial` / divergent。所以 `Kind` 在「操作数已到、
后缀未到」这一格上用 `PostfixPreview`（文档前瞻两个同字符号）判族，保持在场，把 `IdentifierPrimaryPossibleShape`
一起压成 `Waiting`。

**同格互斥（`CatalogGuide` 只在 `Candidates.size === 1` 时建树）**

- 前缀位 `++` / `--` 是 `Symbol`：`IdentifierPrimaryPossibleShape` / 其它原子 `Reject`，
  `BinaryExpressionPossibleShape` 与 A2 的 `BinaryOperatorPossibleShape` 只认二元运算符（`++`/`--` 不在表里）
  也 `Reject`，P1 的六个成员链候选对非 `Common` 的格 `Reject`，P3a 的前缀一元候选
  `IsPrefixText` 把 `++`/`--` 显式排除 ⇒ 只剩本候选；它这一格还不建（操作数未到）。
- 后缀位 `++` / `--` 同格，且操作数格上 `IdentifierPrimaryPossibleShape` 已在本候选的压制下 `Waiting`。
- `let x = a + ++b` 这类「初始化器已经有左操作数」的格子：`Kind` 只看 `=` 之后**第一个**代码单元（`a`），
  后缀是 `+` 不是 `++` ⇒ 族为空 ⇒ 本候选 `Reject`，S 格与 `++` 格照旧走显式抛错（C10，账本零漂移）。

# class UpdateExpressionPossibleShape extends PossibleShape

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后追加一行，`// [P3b]`）。只追加自己这一个新实例。

```ts
shapes.push(new UpdateExpressionPossibleShape());
```

## static field UpdateTexts:Array<string> = ["++", "--"]

本候选认识的 update 运算符文本（前缀位与后缀位同一份文本）。

## static field KindPrefix:string = "pre"

前缀位（`++y` / `--y`）的族名。

## static field KindPostfix:string = "post"

后缀位（`y++` / `y--`）的族名。

## static method IsUpdateText:(text:string)=>bool

```ts
return text === "++" || text === "--";
```

## static method TextOf:(unit:Token)=>string

只有 `Symbol` 能给 update 文本；其余给空串。

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method IsUpdateSymbol:(unit:Token)=>bool

```ts
return UpdateExpressionPossibleShape.IsUpdateText(UpdateExpressionPossibleShape.TextOf(unit));
```

## static method PostfixPreview:(head:Token)=>bool

`head` 之后**同一行**紧接 `++` 或 `--`（两个同字符号，中间不允许空白之外的任何东西）。

只用来看「这一格的后缀还没流进来，但它一定会是 `++` / `--`」——**不跨行**：`a⑉++b`（`asi-postfix-newline`）
在 JS 里是 `a; ++b` 两条语句，本候选若跨行认领会把它从既有 `incremental` 打坏。
文档不可用时返回 `false`（保守：判不出就不争取这一格，宿主保持原来的等待 / 显式抛错）。

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t") {
    at += 1;
    continue;
  }
  break;
}
if (at + 1 >= count) {
  return false;
}
const first = document.GetValue(at);
if (first !== "+" && first !== "-") {
  return false;
}
return document.GetValue(at + 1) === first;
```

## static method Kind:(units:Array<Token>)=>string

`=` 之后的初始化器属于哪个位置：`"pre"`（`++y` / `--y`）、`"post"`（`y++` / `y--`）；不是本候选的形态返回 `""`。

族只看「`=` 之后第一个代码单元 + 它之后的第一个后缀」：`Symbol(++/--)` 打头 ⇒ 前缀位；普通操作数打头且
其后缀是 `++`/`--`（或者后缀尚未流进来、但文档前瞻命中 `PostfixPreview`）⇒ 后缀位。族判定随字符流单调，
所以同一条表达式上只有本候选一个在长。

`suffixAt >= 0` 的分支里，后缀**不是** `++`/`--` 一律 `""`：`a.b` / `a!` / `a[0]` 归 P1，`a + b` 归 A2/P5，
`a++ ++` 这类超范围形态也留给显式抛错（C10）。

```ts
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return "";
}
const head = units[headAt];
if (head instanceof Symbol) {
  const text = (head as Symbol).TempToString();
  if (UpdateExpressionPossibleShape.IsUpdateText(text)) {
    return UpdateExpressionPossibleShape.KindPrefix;
  }
  return "";
}
if (!(head instanceof Common)) {
  return "";
}
if (!MemberChainJudge.HeadAllowed(head)) {
  return "";
}
const suffixAt = MemberChainJudge.FirstSignificant(units, headAt + 1);
if (suffixAt < 0) {
  if (UpdateExpressionPossibleShape.PostfixPreview(head)) {
    return UpdateExpressionPossibleShape.KindPostfix;
  }
  return "";
}
const suffix = units[suffixAt];
if (UpdateExpressionPossibleShape.IsUpdateSymbol(suffix)) {
  return UpdateExpressionPossibleShape.KindPostfix;
}
return "";
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

「这条 update 表达式已经长完、可以整棵建出」：族命中 + 最后一个代码单元之后只剩输入结束（或 `;`）+
legacy `ExpressionBuilder` 能整段吃完。任一不满足返回 `false`（候选继续等）。

`++y` 在 `++` 格上、`y++` 在 `y` 格上 `IsInitializerEnd` 天然为假（后面还有操作数 / 运算符），
所以这里不会在半截上建树。

```ts
const kind = UpdateExpressionPossibleShape.Kind(units);
if (kind === "") {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const last = MemberChainJudge.LastSignificant(units);
if (last <= equalAt) {
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
- 族命中（`Kind` 非空）⇒ `Uncertain`（活着；建不建由 `IsBuildable` 的收口判据决定）；
- 其余（成员链 / 二元 / 字面量 / 其它语句形态的格子）⇒ `Reject`（本候选退场，把格位让给真正要建树的候选）。

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
if (UpdateExpressionPossibleShape.Kind(units) !== "") {
  return ShapeStates.Uncertain;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

只在「整条 update 表达式长完」的那一格放行（前缀位是操作数格、后缀位是运算符格），判据唯一：
`CanBuild`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return UpdateExpressionPossibleShape.CanBuild(units, context.Root.Template, context);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `=` 之后的**全部** raw 单元整棵交给 legacy 建造器（C10：先校验再动手）：
`++y` 得 `PrefixUnaryExpressionShape`、`y++` 得 `PostfixUnaryExpressionShape`，`Pos` / 层级 / 子节点
全部由建造器给出。建完 `host.MountedUnit = null`：后续单元（`;` 等）仍归声明层。

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：expression update 缺赋值符");
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
  throw new Error("增量变量形状未支持：expression update 没有操作数");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression update 未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

`endPossible` 的放行判据：**只认 `++` / `--` 那一格，且族已经落定为本候选的形态**。

`VariableDeclarationEndPossibleShape` 的 `Symbol` 分支会抛 `declaration 符号 ++` / `declaration 符号 --`；
认领的语义是「继续等」。族不命中一律 `false`，保留 C10 的显式抛错——`let x = a + ++b` 一类超范围形态
与 `unary-not` / `unary-delete` 不受本候选影响。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!UpdateExpressionPossibleShape.IsUpdateSymbol(unit)) {
  return false;
}
return UpdateExpressionPossibleShape.Kind(units) !== "";
```
