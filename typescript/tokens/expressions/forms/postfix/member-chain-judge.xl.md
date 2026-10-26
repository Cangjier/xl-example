# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { String } from "../../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
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

# class ShapeRootedTailPossibleShape extends PossibleShape

WP-D3a2：**链头已经是形状**的初始化器的后缀格候选（`const y = f()!` / ``const q = a`x`!.b! `` /
`const z = f() as T!`）。

**为什么需要它（D3a §6 交接的第一条）**：`MemberChainJudge.Kind` 的链头判据只认 `Common`，已建形状头一律
判 `""`，于是 P1 的六个候选在这一族上全部 `Reject`；`VariableDeclarationEndPossibleShape` 走到 `!` 那一格
时既没有候选认领、`IsRawInitializer` 又为假（初始化器里已经有形状）⇒ 按 C10 显式抛
`declaration 符号 !`。全语料 5 条（`expr-tagged-template-bang-suffix` / `expr-r1215-*` /
`expr-assert-kernel-member-chain` / `expr-as-type-nonnull-tail` / `gap-as-bang-array-type`）。

**为什么不是「放宽 `Kind` 让 P1 的 `nonnull` 族接手」**：`Kind` 的族随**第一个**后缀单调落定
（`member-chain-judge` 文件头的设计），而这一族的链是「已建形状 + 一串 raw 后缀」——`a["b"](d).b!` 的第一个
后缀是 `(` / `[`（不是 `!`），放宽 `Kind` 只会让 `member` / `element` 族在那些格上 Accept，
它们各自的 `IsBuildable` 又要求「链已长完」，于是多个候选同格 Accept ⇒ `CatalogGuide` 永远 `Waiting`。
所以这里**单开一个候选，只认「链尾那个 `!`」**：它 `Accept` 的格子与 P1 六族零交集。

**建树方式 = 整段 legacy 重建（与 `MemberChainJudge.Build` 同一套惯用法）**：把 `=` 之后到 `!` 为止的
全部单元（含那个已建形状）交给 legacy `ExpressionBuilder`，`Build` 由 `[D3a2:SHAPE-OPERAND]` 把形状当
操作数吃下、`ParsePostfixSuffix` 把 `!` 接成 `NonNullExpressionShape`。类名 / 层级 / `Pos` / `src` 因此
与 legacy 逐节点同源，不新写第二份「后缀怎么拼」。

**闸门（C10：不放过非法形态）**：

1. 当前格是 `Symbol("!")`；
2. `=` 之后第一个代码单元是**形状**（否则不是本候选的格子：`let x = !y` 的链头是 `!` 本身，
   `let x = a!` 的链头是 `Common`，都留给 P3a / P1）；
3. `!` 的前一个代码单元**能承接后缀**（`CanCarry`：已建形状 / 标识符或数字 / 模板 / 闭合的 `(` `[`）；
4. 重建必须**读完整段**（`builder.At === builder.Units.length`），否则显式抛
   `declaration 已建形状头的后缀未读完` —— 与 `MemberChainJudge.Build` 的「未读完」同一条 C10 出口。

`!` 之后还留着 `(` / `.` / `[` 是允许的：后缀 `!` 比它们都紧，`a`x`!(d)` 的 legacy 树是
`CallExpression > [NonNullExpression, (d)]`，重建完这一段之后后续格由 P2 / P1 的既有候选接着长。

## static method RootIndex:(units:Array<Token>)=>int

`=` 之后第一个代码单元的下标，且那个单元必须是**已建形状**、且**不是叶子原子**；否则 `-1`（本候选不在场）。

**为什么排除叶子原子**（`IdentifierShape` / `NumericLiteralShape` / `StringLiteralShape`，它们的 `Data`
为空）：叶子原子是**逐格目录自己建出来**的，一个 `let x = a…` / `let x = 1…` 的初始化器在那一刻还完全
可以按格往下长。把它们也拉进来会让本候选在**原子候选该建的那一格**上 `Uncertain`，代价有两个（都实测过）：
`let x = tag`a`` 的模板格被挡掉 ⇒ 模板被静默丢掉（divergent）；`a`x`.b!` 的 `a` 格被挡掉 ⇒ 整条
初始化器落到收口格的原子重建，实测丢掉整段（structural=4）。只认**复合形状头**（`CallExpressionShape` /
`TypeOfExpressionShape` / `BinaryExpressionShape` / `PrefixUnaryExpressionShape` / `TaggedTemplateExpressionShape`）
时，退场判据天然在「那半截链已经建完」之后才生效，逐格时序一格不动。

```ts
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return -1;
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return -1;
}
if (!(units[headAt] instanceof ShapeToken)) {
  return -1;
}
if ((units[headAt] as ShapeToken).Data.length === 0) {
  return -1;
}
return headAt;
```

## static method CanCarry:(unit:Token)=>bool

`unit` 能不能当后缀的接收者：已建形状、标识符 / 数字（`as T!` 的 `T`）、模板字面量、
以及闭合的 `(` / `[`（`(a)!` 的 `)`）。

`{` 不算：`= {…}!` 不是合法形态，这一格留给原有路径。

```ts
if (unit instanceof ShapeToken) {
  return true;
}
if (unit instanceof Common) {
  return true;
}
if (unit instanceof String) {
  return true;
}
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  return start === "(" || start === "[";
}
return false;
```

## static method Continues:(head:Token)=>bool

链头之后（跳过空白）紧跟的是不是**后缀续接**（`` ` `` / `[` / `(` / `.` / `!` / `?`），
或者是一个 `as` / `satisfies` 关键字。

这是本候选的**在场判据**：成立才算「已建形状头 + raw 后缀尾巴」这一族，否则当场退场
（`Reject` 在本条目内永不回来）。

**为什么不用「后面还有没有 `!`」当判据**（实测过，更差）：`a`x`.b!` 的链头是 `IdentifierShape(a)`，
用「找 `!`」会把 `let x = a + b`（`a` 建完之后链头也是形状）一起拉进来——多活一格的代价是
`Candidates.size > 1`，别人该建的那一格建不出来（tts 实测 165 条从 `incremental` 退化成 `partial`）。
「紧跟后缀」这条判据对 `let x = a + b` / `let x = 1 + 2` / `let x = f();` 全部为假，因此逐个原子的
既有时序一格不动。

`as` / `satisfies` 也算续接：`const z = f() as T!` 的形状头是 `CallExpressionShape(f())`，
它后面紧跟的是类型运算符而不是后缀符号，但那一条链同样「已经建了半截、剩下的只有 legacy 重建能读」。

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
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  break;
}
if (at < count) {
  const ch = document.GetValue(at);
  if (ch === "." || ch === "[" || ch === "(" || ch === "`") {
    return true;
  }
  // `!` 只有不是 `!=` / `!==` 时才是后缀断言；`?` 只有 `?.` 才是后缀（`?` 单独出现是三目，不是后缀）。
  const next = at + 1 < count ? document.GetValue(at + 1) : "";
  if (ch === "!") {
    return next !== "=";
  }
  if (ch === "?") {
    return next === ".";
  }
}
const word = MemberChainJudge.NextWord(head);
return word === "as" || word === "satisfies";
```

## static method IsTailCell:(units:Array<Token>, tokenIndex:int, headAt:int)=>bool

这一格是不是**只可能由 legacy 整段重建来读**的尾巴格。

**为什么必须逐格区分**（实测，tts 两种失败各一条）：

- `let x = tag`a`` 的模板字面量格上 `TaggedTemplatePrimaryPossibleShape` 要建形状。本候选在那里
  若也活着（`Uncertain`），`Candidates.size` 就是 2，那次建树被挡掉，收口格只剩 `IdentifierShape(tag)`
  与一只没被并入的 `String` ⇒ **静默丢掉模板**（divergent）。所以 `String` / 操作数起首的 `Common` 格一律
  `Reject`：本候选不与任何**原子候选的建树格**抢格子。
- `let x = 1 != 2` / `1 ?? 2` / `1 !== 2` 的运算符格：`Continues` 已经把它们挡在门外（`!=` `??` 不是后缀）。

于是只在这几类格上 `Uncertain`：符号格（`.` `?.` `!` 与二元运算符）、`as` / `satisfies`、
以及**后面还跟着后缀续接**的单元（模板字面量 / 成员名 / 后缀括号）。最后这一条是判据的关键：
`let x = tag`a`` 的模板后面什么都没有 ⇒ 本候选退场，模板格留给 `TaggedTemplatePrimaryPossibleShape`；
`a`x`.b!` 的模板后面跟着 `.` ⇒ 留场，因为那一格之后已经没有候选能接手这条链。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return true;
}
if (unit instanceof Symbol) {
  return true;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "as" || text === "satisfies") {
    return true;
  }
}
return ShapeRootedTailPossibleShape.Continues(unit);
```

## static method IsBangTail:(units:Array<Token>, tokenIndex:int)=>bool


这一格是不是「**形状头链尾的后缀 `!`**」：`RootIndex >= 0` 且当前单元是 `!` 且前一个代码单元能承接后缀。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!(unit instanceof Symbol) || !(unit as Symbol).Is("!")) {
  return false;
}
const headAt = ShapeRootedTailPossibleShape.RootIndex(units);
if (headAt < 0 || headAt >= tokenIndex) {
  return false;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0 || previous < headAt) {
  return false;
}
return ShapeRootedTailPossibleShape.CanCarry(units[previous]);
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只在自己的那一格 `Accept`；其余格 `Uncertain`（`Reject` 是永久的，在这里提前拒掉就再也回不到 `!`）。

`=` 与 trivia 必须 `Uncertain`：`CatalogGuide` 只在建出形状之后才 `Reset`。

**在场判据按「链头之后还有没有 `!`」一刀切**：没有就当场 `Reject`。多活一格的代价不是本候选白等，
而是把 `Candidates.size` 撑在 2，**别人该建的那一格就建不出来**（tts 实测 165 条 RED）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
  return ShapeStates.Uncertain;
}
const headAt = ShapeRootedTailPossibleShape.RootIndex(units);
if (headAt < 0) {
  return ShapeStates.Reject;
}
if (!ShapeRootedTailPossibleShape.Continues(units[headAt])) {
  return ShapeStates.Reject;
}
if (ShapeRootedTailPossibleShape.IsBangTail(units, tokenIndex)) {
  return ShapeStates.Accept;
}
if (ShapeRootedTailPossibleShape.IsTailCell(units, tokenIndex, headAt)) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

与 `ComputeByIndex` 同一条判据（`IsBangTail`），**不在这里再做一次 legacy 重建**：
判定与建树读同一份闸门，`Accept` 与 `IsBuildable` 才不会分叉。重建能不能读完由 `BuildByIndex` 显式报错。

```ts
return ShapeRootedTailPossibleShape.IsBangTail(units, tokenIndex);
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

`VariableDeclarationEndPossibleShape` 在兜底 `throw` 之前问的那一句：这一格是不是「继续等」。
`!` 格上本候选会**在同一格建树**，所以这里答 `true` 是「认领」，不是「支持」。
其余格答 `false`，C10 的显式抛错逐字保留。

必须与 `ComputeByIndex` 的在场判据**同一份**（`IsBangTail` + `Continues`）：认领了却建不出来
（本候选已退场）就是「等下去然后静默丢单元」，C10 不允许。

```ts
if (!ShapeRootedTailPossibleShape.IsBangTail(units, tokenIndex)) {
  return false;
}
const headAt = ShapeRootedTailPossibleShape.RootIndex(units);
if (headAt < 0) {
  return false;
}
return ShapeRootedTailPossibleShape.Continues(units[headAt]);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `=` 之后到 `!` 为止的全部单元交给 legacy `ExpressionBuilder` 整段重建，再原位替换这些单元。
`basePos` / `raw` 的口径与 `MemberChainJudge.Build` 逐字相同（`Pos` = `=` 的 `EndIndex`）。

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
for (let at = equalAt + 1; at <= tokenIndex; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  raw.push(host.Data[at]);
}
if (raw.length < 2) {
  throw new Error("增量变量形状未支持：declaration 已建形状头的后缀未读完");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：declaration 已建形状头的后缀未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]`）。只追加自己这一个**新实例**。

```ts
shapes.push(new ShapeRootedTailPossibleShape());
```
