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
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

# class MemberChainJudge

WP-P1 的**成员链判据**：`=` 之后「一个操作数 + 后缀（`.` / `?.` / `!` / `[...]`）」这一类初始化器
（`let x = a.b` / `a?.b` / `a!` / `a[0]` / `import.meta` / `super.m`）的唯一判定与建树实现。

**为什么用「整棵建」而不是逐格长**：这些形态的 legacy 建造入口就在 `ExpressionBuilder` 的 postfix 循环里
（`. ` / `?.` / `!` / `[` 四个分支，`:1028`/`:1057`/`:1117`/`:1144`），形状类名 / 层级 / `Pos` / `src`
全部由它给出。P1 的六个候选因此**只在初始化器长完的那一格**（后缀的右操作数关闭、其后只剩输入结束或 `;`）
把 `=` 之后的全部 raw 单元整棵交给同一个建造器，再原位替换——树与 legacy EOF 逐节点同源
（与 A4b `CompositeInitializerFormsJudge.Build` 同一套惯用法）。

**族判据 `Kind`**：只看 `=` 之后**第一个代码单元**与它之后的**第一个后缀单元**，两者一起决定唯一的族：
`meta`（`import` + `.` + 前瞻 `meta`）/ `super`（`super` + `.`）/ `optional`（`?.`）/ `element`（`[`）/
`nonnull`（`!`）/ `member`（`.`）。**第一个**后缀决定族（不是最后一个），所以族判定随字符流**单调**：
一旦落定就不会在后续格上改族——六个候选在同一条链上不会互相抢格子（`CatalogGuide` 的 `Reject` 是永久的）。

**为什么 `HeadAllowed` 有前缀关键字黑名单**：`delete` / `typeof` / `void` / `await` / `new` / `yield` / `-` / `!`
这些是**前缀**运算符（P3 的形态，`delete o.p` 就是其中之一）。本判据只认「操作数起首 + 后缀」，把头是
前缀关键字 / 前缀符号的格子留给原来的显式拒绝（C10），否则 `unary-delete` 一类会从 `throw` 漂移成
`partial` —— 那是 P3 的账，不属于 P1。

## static field PrefixKeywords:Array<string> = ["delete", "typeof", "void", "await", "yield", "new", "function", "class", "async", "this", "true", "false", "null", "undefined", "let", "const", "var", "return", "throw", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "with", "debugger", "export", "default", "as", "satisfies", "in", "instanceof"]

链头**不允许**的词：前缀运算符、其它语句 / 声明起点、以及已经被别的候选认领的字面量关键字。
`import` / `super` 不在这张表里（它们是本 WP 的 `meta` / `super` 族链头）。

## static method EqualIndex:(units:Array<Token>)=>int

`units` 里第一个 `Symbol("=")` 的下标（跳过前导 trivia）；没有返回 `-1`。

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

## static method FirstSignificant:(units:Array<Token>, from:int)=>int

`from` 之后第一个非 trivia 单元的下标；没有返回 `-1`。

```ts
for (let at = from; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastSignificant:(units:Array<Token>)=>int

最后一个非 trivia 单元的下标；没有返回 `-1`。

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method SuffixIndex:(units:Array<Token>, headAt:int)=>int

链头之后**第一个**非 trivia 单元的下标（即第一个后缀格）；没有返回 `-1`。

```ts
return MemberChainJudge.FirstSignificant(units, headAt + 1);
```

## static method HeadAllowed:(unit:Token)=>bool

如果链头是 `Common`，且不是 `PrefixKeywords` 里的词、也不以数字起首（`1!=2` 的 `1`、`0x10` 的 `0` 都是数字
字面量的开头，归 `NumericLiteralPossibleShape` / `BigIntLiteralPrimaryPossibleShape`）。

**数字闸门是必需的**：`ChainFollows("1")` 对 `let x = 1!=2` 会看到 `!`、对 `1??2` 会看到 `?`，于是本候选在链头格
上活下来；那一格正是 `NumericLiteralPossibleShape` 要建数字形状的格，`Candidates.size > 1` 会把它挡住
（实测 `bin-ne` / `bin-nullish` / `bin-sne` 从 incremental 退化成 partial）。

`import` / `super` 由 `Kind` 单独分支处理（它们只参与 `meta` / `super` 族），这里一并放行是因为
`MemberChainJudge.Kind` 会在它们身上走自己的分支，不会再落到「普通链头」的 `member` / `element` 路径。

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
if (text.length === 0) {
  return false;
}
if ((unit as Common).CanStartNumber()) {
  return false;
}
if (MemberChainJudge.PrefixKeywords.includes(text)) {
  return false;
}
return true;
```

## static method NextWord:(unit:Token)=>string

`unit` 之后（跳过空白）的一个**词**（`[A-Za-z0-9_$]` 连续段）；不是词 / 输入结束返回 `""`。

`import.meta` 的族判定要跨步稳定：`.` 到达那一格 `meta` 还没流进 `Data`，只能读文档前瞻
（与 A1b / A5c 读 `SourceRange.CurrentDocument` 同一套写法）。

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  break;
}
let word = "";
while (at < count) {
  const ch = document.GetValue(at);
  const isWord = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWord) {
    break;
  }
  word += ch;
  at += 1;
}
return word;
```

## static method ChainFollows:(head:Token)=>bool

链头之后（跳过空白）的第一个字符是不是成员链后缀的首字符（`.` / `?` / `!` / `[`）。

这是**链头格**上的在场判据：`a.b` 的 `a` 之后是 `.` ⇒ 继续等；`a + b` 的 `a` 之后是 `+` ⇒ 当场退场，
不要拖到 `+` 格才退——早退场的好处是链头格上不会多活一个候选，把格位让给真正要建树的那个候选。
文档不可用时放行（与 `PrimaryAtomGuard.IsTerminalAfter` 同一口径：真实驱动链一定设 `CurrentDocument`）。

**[R4] 两字符二元运算符不算后缀**：`a != b` / `a !== b` 的 `!` 后面紧跟 `=`，是 `BinaryOperatorPossibleShape`
的运算符而不是非空断言；`a ?? b` 的 `?` 后面紧跟另一个 `?`，是 `??` 而不是 `?.`。这两种格若仍按
「后缀首字符」留在场，三个成员链候选会在链头格上把 `IdentifierPrimaryPossibleShape` 挤成非唯一候选，
A1 不物化左操作数，`!=` / `??` 就只能退回 EOF 原子建树——再遇到结合更紧的运算符（`a != b < c`）时
`<` 那一格没有任何候选认领，直接抛「declaration 符号 <」。只看紧邻的下一个字符，不前瞻整词。

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return true;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "!" && at + 1 < count && document.GetValue(at + 1) === "=") {
    return false;
  }
  if (ch === "?" && at + 1 < count && document.GetValue(at + 1) === "?") {
    return false;
  }
  return ch === "." || ch === "?" || ch === "!" || ch === "[";
}
return false;
```

## static method PostfixEnd:(head:Token)=>int

「链头之后紧接一个后缀 `!`，而 `!` 之后只剩输入结束（允许空白与 `;`）」时返回 **`!` 之后的下标**，
否则返回 `-1`。

只服务 `NonNullPossibleShape`：后缀非空断言的建树格（`!` 关闭那格）被 `DeclarationCellGuard` 挡住
（A6 为 `let x!: T` 准备的守卫在 `!` 格一律 `Reject`），所以它必须**提前一格**在链头格上建。
闸门要求「整条链就是 `<操作数>!`」：`a! + b` / `a!.b` / `a != b` 都不命中，那里照旧走显式抛错（C10）。

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return -1;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  break;
}
if (at >= count || document.GetValue(at) !== "!") {
  return -1;
}
const bangEnd = at + 1;
let tail = bangEnd;
while (tail < count) {
  const ch = document.GetValue(tail);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029" || ch === ";") {
    tail += 1;
    continue;
  }
  return -1;
}
return bangEnd;
```

## static method Kind:(units:Array<Token>)=>string

`=` 之后的初始化器属于哪一族：`"meta"` / `"super"` / `"optional"` / `"element"` / `"nonnull"` / `"member"`；
不是本 WP 的形态返回 `""`。

族只看「链头 + 第一个后缀」：族判定因此随字符流单调（后缀一旦出现就不会再变），六个候选不会在同一条链上
交替存活。

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
if (!(head instanceof Common)) {
  return "";
}
const headText = (head as Common).TempToString();
const suffixAt = MemberChainJudge.SuffixIndex(units, headAt);
if (suffixAt < 0) {
  return "";
}
const suffix = units[suffixAt];
if (headText === "import") {
  // `import.meta`：`import` 是关键字主表达式，`.meta` 是唯一的合法后缀形态。
  if (!(suffix instanceof Symbol) || !(suffix as Symbol).Is(".")) {
    return "";
  }
  if (MemberChainJudge.NextWord(suffix) !== "meta") {
    return "";
  }
  return "meta";
}
if (headText === "super") {
  // `super.m`：`super` 是关键字主表达式（legacy `SuperKeywordShape`），只接 `.` 成员链。
  if (!(suffix instanceof Symbol) || !(suffix as Symbol).Is(".")) {
    return "";
  }
  return "super";
}
if (!MemberChainJudge.HeadAllowed(head)) {
  return "";
}
if (suffix instanceof Symbol) {
  const text = (suffix as Symbol).TempToString();
  if (text === ".") {
    return "member";
  }
  if (text === "?.") {
    return "optional";
  }
  if (text === "!") {
    return "nonnull";
  }
  return "";
}
if (suffix instanceof Bracket) {
  if ((suffix as Bracket).StartBracketChar === "[") {
    return "element";
  }
  return "";
}
return "";
```

## static method Claims:(kind:string, units:Array<Token>, tokenIndex:int)=>bool

`endPossible` 的放行判据（`PossibleShape.ContinuationClaim` 的实现体）：这一格是不是**本族的后缀格**。

只有当「当前格是本族的后缀符号 / `[` 括号」且「族已经落定为本族」时返回 `true` —— 语义是**继续等**
（表达式还没长完），不是「支持」。其余格子返回 `false`，调用方保留 C10 的显式 `throw`。

**为什么必须先看族**：`endPossible` 的 `Symbol` / `Bracket` 分支会抛 `declaration 符号 <t>` / `declaration 括号`，
但它**不认识族**。若在这里对任意 `.` / `!` / `[` 都放行，`delete o.p`（P3）、`let x = a! = b` 这类不属于
本族的形态会从 `throw` 漂移成 `partial` —— 账本必须逐条不变，所以族不命中一律 `false`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (MemberChainJudge.Kind(units) !== kind) {
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

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

「这条成员链已经长完、可以整棵建出」：族命中 + 最后一个代码单元之后只剩输入结束（或 `;`）+
legacy `ExpressionBuilder` 能整段吃完。任一不满足返回 `false`（候选继续等）。

`!` / `.` / `?.` 那一格的 `IsInitializerEnd` 天然为假（后面还有右操作数），所以这里不会在半截上建树。

```ts
if (MemberChainJudge.Kind(units) === "") {
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

## static method Build:(host:Token, context:SyntaxContext)=>Token

把 `=` 之后的**全部** raw 单元整棵建成表达式，替换掉这些单元；`Pos` / 层级 / 子节点由 legacy 建造器给出
（与 legacy EOF 树逐节点同源）。建完 `host.MountedUnit = null`：后续单元（`;` 等）仍归声明层。

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 成员链缺赋值符");
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
