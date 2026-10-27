# dependencies
```xl
import { CatalogGuide } from "../../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { PossibleShape } from "../../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ItemUtil } from "../../../item-util.xl.md"
import { IdentifierShape } from "../../../names/identifier-shape.xl.md"
import { ColonTokenShape } from "../../../punctuation/colon-token-shape.xl.md"
import { QuestionTokenShape } from "../../../punctuation/question-token-shape.xl.md"
import { ConditionalExpressionShape } from "../../conditional-expression-shape.xl.md"
import { IncrementalItemPosition, NumericLiteralPossibleShape } from "../../numeric-literal-possible-shape.xl.md"
import { CompositeInitializerJudge } from "../primary/composite-initializer-judge.xl.md"
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { ObjectLiteralOperandPossibleShape } from "../shared/object-literal-operand.xl.md"
```

# namespace cangjie

WP-P4 的**条件表达式（三目）候选**：`let x = a ? b : c` / `let x = a ? b : c;`。

**为什么需要它**：`?` / `:` 在声明终结候选里撞兜底 `throw ... declaration 符号 ?`
（`CompositeInitializerFormsJudge.Family` 对「标识符起首的三元」返回 `""`，A4b 明确不认领；A2 的二元候选
也不管 `?` / `:`）。所以这一族此前只能停在 `throw`。

**与既有候选的互斥（同格双 `Accept` = 永远 `Waiting`）**：

- `a` 那一格本候选 `Uncertain`（族命中、但要等 `?`），A1 的 `IdentifierPrimaryPossibleShape` 同时 `Accept`
  ⇒ 目录 `Waiting`，`a` 保持 basic `Common`——本候选在 `?` 那一格自己把它建成 `IdentifierShape`；
- `(` / `[` / `{` / `function` / `class` / `async` / 箭头 / `new` / 前缀一元：族判据 `false` ⇒ `Reject`，
  完全让给 A4 / A4b / A4c / A5 / P3。

**为什么族判据要做文档前瞻**：`Reject` 在 `CatalogGuide` 里是**永久**的（本条目内不回来）。`?` 到达之前
只能靠字符前瞻判「这个初始化器是三目」，到达之后靠「`=` 之后第一个代码单元 + 它后面仍是 `?`」判——
两种都要命中同一条判据，否则 `?` 到达那一格会重新变成「不是本族」。A4b 的 `HasAssertSuffix` 用的是同一套
「跨步稳定」写法。

**为什么在 `?` 那一格就建形状**（而不是像 A4b 那样等整条长完）：整条长完那一格最后一个单元是 `c`
（一个 `Common`），A1 的原子候选在**同一格**也 `Accept`（它只看「是不是 `Common`」，`IsBuildable` 才判
是否收口）⇒ 目录永远 `Waiting`，三目永远建不出来。所以形状必须在 `?` 上就落地，中段 / `:` / 右段由
`ConditionalMemberPossibleShape` 在形状内部继续吃（与 A2 `BinaryExpressionPossibleShape` 建完二元后
「宿主切到二元、后续字符进二元 `Data`」是同一条机制）。

# class ConditionalPossibleShape extends PossibleShape

声明层初始化器位置的三目候选（宿主是 `VariableDeclarationShape`）。

## static method AppendTo:(shapes:Array<PossibleShape>)=>void

注册区入口（`ExpressionShapeCatalog.AppendFragments`，锚点 `// [E-CAT:FRAGMENTS]`）：只追加本候选一个实例。

```ts
shapes.push(new ConditionalPossibleShape());
```

## static method RawAfter:(unit:Token, length:int)=>string

`unit` 之后（跳过空白）最多 `length` 个原始字符。只用来区分 `?` 与 `?.` / `??`：与 A4b 的
`CompositeInitializerFormsJudge.RawAfter` 同一口径，不新造判据。

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
let text = "";
const count = document.GetCount();
let at = range.EndIndex;
while (at < count && text.length < length) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  text += ch;
  at += 1;
}
return text;
```

## static method IsQuestionSymbol:(unit:Token)=>bool

当前格是不是三目的 `?`（`?.` / `??` 不算：它们是成员链 / 空值合并，不是条件表达式）。

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
if (!(unit as Symbol).Is("?")) {
  return false;
}
const pair = ConditionalPossibleShape.RawAfter(unit, 2);
if (pair.length >= 2) {
  const second = pair[1];
  if (second === "." || second === "?") {
    return false;
  }
}
return true;
```

## static method IsHeadUnit:(unit:Token)=>bool

`=` 之后的**第一个代码单元**能不能当三目的条件：标识符 / 数字（已建成的原子形状也算），
关键字起首的形态（`function` / `class` / `async` / `new` / 前缀一元 / 箭头 …）一律不是。

```ts
if (unit instanceof ShapeToken) {
  return true;
}
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
if (text === "function" || text === "class" || text === "async" || text === "new"
  || text === "typeof" || text === "void" || text === "delete" || text === "await" || text === "yield"
  || text === "true" || text === "false" || text === "null" || text === "this"
  || text === "in" || text === "instanceof") {
  return false;
}
return true;
```

## static method Family:(units:Array<Token>)=>bool

「这个初始化器是三目」的**跨步稳定**判据：`=` 之后第一个代码单元是本候选认的操作数，且它后面
（文档前瞻，跳过空白）第一个字符是 `?`（不是 `?.` / `??`）。

`?` 到达前后都命中同一条：到达前看的是 `a` 之后的前瞻字符，到达后 `a` 之后仍然是同一个 `?`。

```ts
const equalAt = CompositeInitializerJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const headAt = ItemUtil.NextCode(units, equalAt + 1);
if (headAt >= units.length) {
  return false;
}
const head = units[headAt];
if (!ConditionalPossibleShape.IsHeadUnit(head)) {
  return false;
}
const pair = ConditionalPossibleShape.RawAfter(head, 2);
if (pair.length === 0 || pair[0] !== "?") {
  return false;
}
if (pair.length >= 2 && (pair[1] === "." || pair[1] === "?")) {
  return false;
}
return true;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

- 越界 / trivia → `Uncertain`（E0b 实测约束 1：被 `Reject` 的候选本条目内不回来）；
- `Symbol("=")` → `Uncertain`（初始化器还没开始，此时 `Family` 也还判不出来）；
- 族不命中 → `Reject`（不是三目，交给 A1/A4/A4b/A5 或 C10 的显式 throw）；
- 族命中但还没到 `?` → `Uncertain`（等 `?` 那一格）；
- 当前格是 `?` → `Accept`（目录在这一格建 `ConditionalExpressionShape`）。

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
const start = ItemUtil.ItemStartCached(units, cache);
if (tokenIndex < start) {
  return ShapeStates.Reject;
}
if (!ConditionalPossibleShape.Family(units)) {
  return ShapeStates.Reject;
}
if (!ConditionalPossibleShape.IsQuestionSymbol(unit)) {
  return ShapeStates.Uncertain;
}
return ShapeStates.Accept;
```

## method ContinuationClaim:(units:Array<Token>, tokenIndex:int)=>bool

D0 的通用委派（`ExpressionContinuationCatalog.Claims`）：`?` 那一格必须认领，否则
`VariableDeclarationEndPossibleShape` 的兜底 `throw ... declaration 符号 ?` 会先发生。

只认领 `?`：族命中 + 当前格是 `?`。`:` 不认领——形状在 `?` 那一格已经建出来并挂载，`:` 落在形状内部，
声明层再也看不到它（`A4b` 的 `?`/`:` 分支比本候选先判，不冲突）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (!ConditionalPossibleShape.Family(units)) {
  return false;
}
// [T11] 箭头分支的三目走「不建树 → 收口格 legacy 整条建」：分支里的 `=>` 与三目自己的 `:`
// 因此落在声明层，必须由本候选认领（否则声明终结候选按 C10 抛 `declaration 符号 =>` / `符号 :`）。
// 只认 `=>` / `:` 两个符号；三目真的被建出来时这两格根本到不了声明层（形状已挂载）。
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === "=>" || text === ":") {
    return true;
  }
}
return ConditionalPossibleShape.IsQuestionSymbol(unit);
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

[T11] **分支是箭头时不建**：`flag ? (a: number) => a + 1 : (a: number) => a - 1`。
[T12] **分支头建不住时也不建**：`flag ? 1 : () => 0` / `x ? "t" : "f"` / `a ? (a) : (a)`。

三目的两个分支位在本目录里只有「`Common` 操作数」与「值位 `{ … }`」两种形态——箭头
（`(a: T) => …` / `() => …` / 体是字符串的箭头）、字面量（`"t"` / `` `t` `` / `/re/`）、括号
（`(a)`）、前缀一元一个都不在目录里，那一格会 `Reject` ⇒ 候选全灭 ⇒
`CatalogGuide` 抛「没有候选形状可以构成」。

这里不补第二套分支建造器：这些分支的形态与 legacy `ExpressionBuilder.ParseExpression` 完全重合，
而声明收口格本来就有一条「初始化器没有唯一根 ⇒ 整条 raw 交 legacy 建」的通路
（`VariableDeclarationShape.FinishIncremental` 的 `builtShape === null` 分支）。所以本候选在
`?` 那一格**保持在场但不建树**，整条三目留在 raw，收口格由 legacy 一次建出（与 legacy 同树）。

判据 `HasLegacyBranch` 两条腿、都跨步稳定：`?` 之后出现 `=>` 符号单元、或中段 / 右段的分支头是
**本目录必须让路的两种分支头**（字面量 / 箭头）：`HasArrowBranch` + `UnbuildableBranchHead`。
**两个分支位都要看**：T11 的判据只看中段（`?` 之后的前瞻就是 `(`），`flag ? 1 : () => 0` 的
箭头落在右段，`?` 那一格照样建树，右段的 `(` 随后在形状里 `Reject`。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return true;
}
return !ConditionalPossibleShape.HasLegacyBranch(units);
```

## static method QuestionIndex:(units:Array<Token>)=>int

`units` 里三目 `?` 的位置（已建成的 `QuestionTokenShape` 或还没建的 `Symbol("?")`），没有返回 `-1`。

```ts
let at = -1;
for (let index = 0; index < units.length; index++) {
  const unit = units[index];
  if (unit instanceof QuestionTokenShape) {
    at = index;
    continue;
  }
  if (ConditionalPossibleShape.IsQuestionSymbol(unit)) {
    at = index;
  }
}
return at;
```

## static method HasArrowBranch:(units:Array<Token>)=>bool

三目的**某一支是箭头**：`?` 之后已经出现 `=>` 符号单元，或者 `?` 之后（跳过空白）是 `(`
且配对 `)` 之后紧跟 `=>`。

```ts
const questionAt = ConditionalPossibleShape.QuestionIndex(units);
if (questionAt < 0) {
  return false;
}
for (let index = questionAt + 1; index < units.length; index++) {
  const unit = units[index];
  if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
    return true;
  }
}
return ConditionalPossibleShape.ArrowFollowsQuestion(units[questionAt]);
```

## static method HasLegacyBranch:(units:Array<Token>)=>bool

三目的某一支必须由 legacy 建：**箭头分支**（`HasArrowBranch`）或**分支头建不住**
（`UnbuildableBranchHead`）。两条判据都只读结构位 / 字符前瞻，结果随字符流单调。

```ts
if (ConditionalPossibleShape.HasArrowBranch(units)) {
  return true;
}
const questionAt = ConditionalPossibleShape.QuestionIndex(units);
if (questionAt < 0) {
  return false;
}
return ConditionalPossibleShape.UnbuildableBranchHead(units[questionAt]);
```

## static method IsBuildableHeadChar:(ch:string)=>bool

分支位第一个代码字符能不能落成 `ConditionalMemberPossibleShape` 认的两种形态
（`Common` 操作数 / 值位 `{ … }`）：标识符起首、数字起首、`{`。其余（引号、反引号、`(`、`[`、
`/`、`-`、`!`、`.`、`@` …）一律不是。

与 `DeclarationAsiBoundary` 的「是不是标识符起首」同一套字符判据（不新造词法表）。

```ts
if (ch === "{") {
  return true;
}
if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")) {
  return true;
}
if (ch >= "0" && ch <= "9") {
  return true;
}
return ch === "_" || ch === "$";
```

## static method UnbuildableBranchHead:(question:Token)=>bool

文档前瞻：`?` 之后**中段**与 `:` 之后**右段**的第一个代码字符，只要有一个是**本候选必须让路**的
两种分支头，返回 `true`：

| 分支头 | 让路？ | 为什么 |
| --- | --- | --- |
| 引号 / 反引号（`"t"` / `` `t` ``） | 是 | 字面量不是 `Common`，`ConditionalMemberPossibleShape` 那一格 `Reject` |
| `(` 且配对 `)` 之后紧跟 `=>` | 是 | 括号箭头（`() => 0` / `(a) => a`）——`ParenArrowAt` |
| 标识符词且词之后紧跟 `=>` | 是 | 单参箭头（`x => x`）——`WordArrowAt` |
| 其余（数字 / `{` / `_` / `$` / `[` / 前缀一元 …） | 否 | 保持 T11 之前的老行为，本轮不扩大范围 |

**范围为什么只到这里**：`flag ? 1 : (a)` / `flag ? a.b : 1` / `flag ? g(1) : 2` 这些「分支是括号 /
成员链 / 调用」的形态另有收口面的账，本轮不动它们——实测把它们也判成「让路」会让
`expr-r1233-control-head-regex.ts` 从「整条 legacy（树正确）+ fallback」变成「增量（树与 TS 有差）+
不 fallback」，那是拿错树换 fallback 数，C10 明确禁止。

扫描规则（只看字符，不建树）：跳过空白；字符串 / 模板正文跳过（与 `ArrowFollowsQuestion` 同口径，
引号起止、不解析插值）；`(` / `[` / `{` 计深度，`)` / `]` / `}` 减深度；**深度 0 上的** `;` / `,`
或收尾括号 ⇒ 表达式结束（返回 `false`）；中段里的 `?`（不是 `?.` / `??`）与 `:` 成对抵消（内层三目），
剩下的第一个深度 0 的 `:` 是中段 / 右段的分隔符。

**为什么要看右段**：`flag ? 1 : () => 0` 的 `?` 那一格只看得见 `1`，T11 的判据（只看中段）放行后
形状建出来，右段的 `(` 在 `ConditionalMemberPossibleShape` 里 `Reject` ⇒ 候选全灭。

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return false;
}
const count = document.GetCount();
let at = range.EndIndex;
let depth = 0;
let nested = 0;
let headSeen = false;
let guard = 0;
const skipSpace = ():void => {
  while (at < count) {
    const ch = document.GetValue(at);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
      at += 1;
      continue;
    }
    return;
  }
};
while (at < count) {
  guard += 1;
  if (guard > 8192) {
    return false;
  }
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  if (!headSeen) {
    headSeen = true;
    if (ch === "\"" || ch === "'" || ch === "`") {
      return true;
    }
    if (ch === "(") {
      return ConditionalPossibleShape.ParenArrowAt(question, at);
    }
    if (ConditionalPossibleShape.IsBuildableHeadChar(ch)
      && ConditionalPossibleShape.WordArrowAt(question, at)) {
      return true;
    }
  } else if (ch === "\"" || ch === "'" || ch === "`") {
    const quote = ch;
    at += 1;
    while (at < count && document.GetValue(at) !== quote) {
      if (document.GetValue(at) === "\\") {
        at += 1;
      }
      at += 1;
    }
    at += 1;
    continue;
  }
  if (ch === "(" || ch === "[" || ch === "{") {
    depth += 1;
    at += 1;
    continue;
  }
  if (ch === ")" || ch === "]" || ch === "}") {
    if (depth === 0) {
      return false;
    }
    depth -= 1;
    at += 1;
    continue;
  }
  if (depth === 0 && (ch === ";" || ch === ",")) {
    return false;
  }
  if (depth === 0 && ch === "?") {
    if (at + 1 < count) {
      const next = document.GetValue(at + 1);
      if (next !== "." && next !== "?") {
        nested += 1;
      }
    }
    at += 1;
    continue;
  }
  if (depth === 0 && ch === ":") {
    if (nested > 0) {
      nested -= 1;
      at += 1;
      continue;
    }
    at += 1;
    skipSpace();
    if (at >= count) {
      return false;
    }
    const head = document.GetValue(at);
    if (head === "\"" || head === "'" || head === "`") {
      return true;
    }
    if (head === "(") {
      return ConditionalPossibleShape.ParenArrowAt(question, at);
    }
    if (ConditionalPossibleShape.IsBuildableHeadChar(head)
      && ConditionalPossibleShape.WordArrowAt(question, at)) {
      return true;
    }
    return false;
  }
  at += 1;
}
return false;
```

## static method WordArrowAt:(question:Token, from:int)=>bool

`from` 起的一个**词**之后（跳过空白）是不是 `=>`。只走一个词、不越过任何括号：
`g(x => x)` 的词是 `g`、后面是 `(` ⇒ 假；`x => x` ⇒ 真。

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || from < 0) {
  return false;
}
const count = document.GetCount();
let scan = from;
if (scan >= count) {
  return false;
}
const first = document.GetValue(scan);
const firstIsLetter = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z");
if (!firstIsLetter && first !== "_" && first !== "$") {
  return false;
}
while (scan < count) {
  const ch = document.GetValue(scan);
  const isWord = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWord) {
    break;
  }
  scan += 1;
}
while (scan < count) {
  const ch = document.GetValue(scan);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
    scan += 1;
    continue;
  }
  break;
}
if (scan + 1 >= count) {
  return false;
}
return document.GetValue(scan) === "=" && document.GetValue(scan + 1) === ">";
```

## static method ArrowFollowsQuestion:(question:Token)=>bool

文档前瞻：`question` 之后跳过空白是 `( … )`、再跳过空白是 `=>`（括号箭头）。本体在
`ParenArrowAt`（分支头也可能从 `:` 之后的某个下标起算，两处共用一份实现）。

```ts
const range = question.SourceRange;
if (range.EndIndex < 0) {
  return false;
}
return ConditionalPossibleShape.ParenArrowAt(question, range.EndIndex);
```

## static method ParenArrowAt:(question:Token, from:int)=>bool

`from` 之后跳过空白是 `( … )`、再跳过空白是 `=>`。跳过字符串字面量里的括号
（形参默认值里可能有 `"("`）；其余字符只做括号计数。

```ts
const range = question.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || from < 0) {
  return false;
}
const count = document.GetCount();
let at = from;
const skipSpace = ():void => {
  while (at < count) {
    const ch = document.GetValue(at);
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v") {
      at += 1;
      continue;
    }
    return;
  }
};
skipSpace();
if (at >= count || document.GetValue(at) !== "(") {
  return false;
}
let depth = 0;
let closed = false;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === "(") {
    depth += 1;
    at += 1;
    continue;
  }
  if (ch === ")") {
    depth -= 1;
    at += 1;
    if (depth === 0) {
      closed = true;
      break;
    }
    continue;
  }
  if (ch === "\"" || ch === "'" || ch === "`") {
    const quote = ch;
    at += 1;
    while (at < count && document.GetValue(at) !== quote) {
      if (document.GetValue(at) === "\\") {
        at += 1;
      }
      at += 1;
    }
    at += 1;
    continue;
  }
  at += 1;
}
if (!closed) {
  return false;
}
skipSpace();
if (at + 1 >= count) {
  return false;
}
return document.GetValue(at) === "=" && document.GetValue(at + 1) === ">";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

在 `?` 那一格把 `ConditionalExpressionShape` 建出来，并把宿主切到它：

1. 左操作数 = `?` 前一个非 trivia 单元：`Common` 就地建成 `IdentifierShape` / `NumericLiteralShape`
   （`Pos` 按 C1 = 前一个非 trivia 单元的 `EndIndex`）；已经是形状的直接用；
2. `?` 建成 `QuestionTokenShape`（`Op` 为空，打印时按 `SourceRange` 切原文，与 legacy 同口径）；
3. `ConditionalExpressionShape`：`Pos` = 左操作数的 `Pos`，`src` 从左操作数的起点签入；
4. 把「左操作数 + `?`」两格替换成本形状、`host.MountedUnit = 本形状`，并给它挂
   `ConditionalMemberPossibleShape` 目录（中段 / `:` / 右段在形状内部继续吃）。

```ts
const data = host.Data;
const questionAt = ItemUtil.NextCode(data, tokenIndex);
if (questionAt < 0 || questionAt >= data.length) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺问号");
}
const question = data[questionAt];
if (!ConditionalPossibleShape.IsQuestionSymbol(question)) {
  throw new Error("增量变量形状未支持：expression 条件表达式问号");
}
const leftAt = ItemUtil.PreviousCode(data, questionAt - 1);
if (leftAt < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式缺左操作数");
}
const leftUnit = data[leftAt];
let leftShape: ShapeToken;
if (leftUnit instanceof ShapeToken) {
  leftShape = leftUnit as ShapeToken;
} else if (leftUnit instanceof Common) {
  leftShape = ConditionalPossibleShape.BuildOperand(leftUnit as Common, host, leftAt, context);
} else {
  throw new Error("增量变量形状未支持：expression 条件表达式左操作数");
}
if (!leftShape.Closed) {
  leftShape.TryToClose(context);
}
const questionShape = new QuestionTokenShape(host.Template);
if (question.SourceRange.Start >= 0) {
  questionShape.SignIn(question.SourceRange.Start);
}
if (question.SourceRange.End >= 0) {
  questionShape.SignOut(question.SourceRange.End);
}
questionShape.Pos = IncrementalItemPosition.AfterPreviousCode(data, questionAt);
(question as Symbol).Replace(questionShape);
const conditional = new ConditionalExpressionShape(host.Template);
if (leftShape.SourceRange.Start >= 0) {
  conditional.SignIn(leftShape.SourceRange.Start);
}
conditional.Pos = leftShape.Pos;
conditional.Add(leftShape);
conditional.Add(questionShape);
data.splice(questionAt, 1);
data.splice(leftAt, 1);
data.splice(leftAt, 0, conditional);
conditional.Parent = host;
host.MountedUnit = conditional;
conditional.CatalogGuide = new CatalogGuide([new ConditionalMemberPossibleShape()], null);
return conditional;
```

## static method BuildOperand:(token:Common, host:Token, tokenIndex:int, context:SyntaxContext)=>ShapeToken

把「条件」那一格的 basic `Common` 建成原子形状（数字 → `NumericLiteralShape`，其余 → `IdentifierShape`）。
`Pos` 一律按 C1 取「前一个非 trivia 单元的 `EndIndex`」。

```ts
if (token.IsNumber()) {
  return NumericLiteralPossibleShape.BuildLiteral(token, host, tokenIndex, context);
}
const identifier = IdentifierShape.FromBasicToken(token, context);
identifier.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(identifier);
return identifier;
```

# class ConditionalMemberPossibleShape extends PossibleShape

`ConditionalExpressionShape` 内部的成员候选：**中段操作数 → `:` → 右段操作数**三步都走这一个候选、
一个目录（`host.Data` 的末两个代码单元决定现在处于哪一步）。

| 前一个代码单元 | 当前格 | 建什么 |
| --- | --- | --- |
| `QuestionTokenShape` | `Common` / 值位 `{ … }` | 中段操作数（`IdentifierShape` / `NumericLiteralShape` / `ObjectLiteralExpressionShape`） |
| 形状（中段操作数） | `Symbol(":")` | `ColonTokenShape` |
| `ColonTokenShape` | `Common` / 值位 `{ … }` | 右段操作数，然后**替宿主封口 + 卸载**（C3） |

**[R19:OBJECT] 值位对象字面量**：`a ? { b: 1 } : c` 的中段 / 右段都可能是 `{ … }`。判据与建树全部转调
`ObjectLiteralOperandPossibleShape`（`Claims` / `BuildInto`），本类不写第二份——与右操作数目录里那条
`object` 形态是**同一份实现**。

右段一建完 `ConditionalExpressionShape` 就完整了：`TryToClose` 用最后一个子单元的终点补右边界，
`Quit` 清 `Parent.MountedUnit`，后续 `;` / EOF 回到声明层（与 `BinaryExpressionShape.SealRightOperand`
同一条机制，不给 core 加钩子）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const previous = ItemUtil.PreviousCode(units, tokenIndex - 1);
if (previous < 0) {
  return ShapeStates.Reject;
}
const before = units[previous];
if (before instanceof QuestionTokenShape) {
  // 中段操作数（[R19:OBJECT] 值位 `{ … }` 也是操作数：`a ? { b: 1 } : c`）
  if (unit instanceof Common || ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (ConditionalMemberPossibleShape.IsColonSymbol(unit)) {
  // 中段操作数之后是 `:`
  if (before instanceof ShapeToken && !(before instanceof QuestionTokenShape)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (before instanceof ColonTokenShape) {
  // 右段操作数（[R19:OBJECT] 同上）
  if (unit instanceof Common || ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
return ShapeStates.Reject;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

trivia 格不建（`ComputeByIndex` 对 trivia 只能 `Uncertain`，不能 `Reject`；`IsBuildable` 若是默认的 `true`，
目录会在注释那一格建——`RightOperandPossibleShape` 实测过的同一个坑）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return !units[tokenIndex].IsTriviaToken;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
if (!(host instanceof ConditionalExpressionShape)) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员宿主不是条件表达式");
}
const conditional = host as ConditionalExpressionShape;
const data = conditional.Data;
if (tokenIndex < 0 || tokenIndex >= data.length) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员");
}
// trivia（空白 / 注释）不属 legacy 的 `ConditionalExpressionShape.Data`（它的子单元就是
// 「条件 ? 中段 : 右段」五个代码单元），留在形状里会变成增量树多出来的 basic 行。建之前从形状里摘掉：
// 与 `RightOperandPossibleShape` 对运算符后 trivia 的处理同一口径。
const current = data[tokenIndex];
for (let scan = data.length - 1; scan >= 0; scan--) {
  if (data[scan].IsTriviaToken) {
    data.splice(scan, 1);
  }
}
const at = data.indexOf(current);
if (at < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员");
}
const unit = data[at];
const previous = ItemUtil.PreviousCode(data, at - 1);
if (previous < 0) {
  throw new Error("增量变量形状未支持：expression 条件表达式成员缺前驱");
}
const before = data[previous];
if (before instanceof QuestionTokenShape) {
  if (unit instanceof Bracket && ObjectLiteralOperandPossibleShape.Claims(unit)) {
    return ObjectLiteralOperandPossibleShape.BuildInto(conditional, at, context);
  }
  return ConditionalPossibleShape.BuildOperand(unit as Common, conditional, at, context);
}
if (ConditionalMemberPossibleShape.IsColonSymbol(unit)) {
  return ConditionalMemberPossibleShape.BuildColon(unit as Symbol, conditional, at, context);
}
if (before instanceof ColonTokenShape) {
  let shape: Token;
  if (unit instanceof Bracket && ObjectLiteralOperandPossibleShape.Claims(unit)) {
    shape = ObjectLiteralOperandPossibleShape.BuildInto(conditional, at, context);
  } else {
    shape = ConditionalPossibleShape.BuildOperand(unit as Common, conditional, at, context);
  }
  conditional.TryToClose(context);
  if (conditional.Parent !== null && conditional.Parent.MountedUnit === conditional) {
    conditional.Quit();
  }
  return shape;
}
throw new Error("增量变量形状未支持：expression 条件表达式成员");
```

## static method IsColonSymbol:(unit:Token)=>bool

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is(":");
```

## static method BuildColon:(token:Symbol, host:Token, tokenIndex:int, context:SyntaxContext)=>Token

`Symbol(":")` → `ColonTokenShape`：范围沿用 basic 单元，`Pos` 按 C1，原位 `Replace`，建完立刻 `TryToClose`。
（`ColonTokenShape` 没有 `FromSymbol` 工厂，这里按 `PlusTokenShape.FromSymbol` 的同一口径就地建。）

```ts
const shape = new ColonTokenShape(host.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Pos = IncrementalItemPosition.AfterPreviousCode(host.Data, tokenIndex);
token.Replace(shape);
shape.TryToClose(context);
return shape;
```
