# dependencies
```xl
import { Bracket } from "../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { ExpressionStatementPossibleShape } from "../../statements/expression-statement-possible-shape.xl.md"
import { StatementBoundaryUtil } from "../../statements/statement-boundary-util.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
```

# namespace cangjie

[A2-D1] 增量变量声明的**语句边界（ASI）判据**。

本类不新写 ASI 词法：只把两个**既有**判据拼在一起，回答「这一格能不能把当前这条增量声明关掉」：

1. **语句边界**：`StatementBoundaryUtil.CanEndStatement(units, tokenIndex, atEof)`——与根表达式语句
   （`root-expression-statement-possible-shape.xl.md` 的「头格被上一条语句吞掉」补建）用的是**同一份**判据。
   它内部已经包含 `;` / EOF / ASI 换行 / 声明跟随边界的全部分支，所以 `let x = a` ⏎ `+ b` 这类
   「下一格是续接符」的格子不会被误判成边界（`IsContinuation` 在同一份判据里）。
2. **本条声明是否已经有可结束的形状**：有初始化器根（`=` 之后已经有非 basic 的形状），
   或从未出现 `=` 且绑定已经完整。没有这一条时，`let x =` ⏎ 之类的半截声明会被提前关掉。

**生效范围（本 WP 唯一允许的落点）**：`VariableDeclarationEndPossibleShape` 的 `Common` 分支
与 trivia 分支。`Symbol` 分支（`=` / 二元 / `;` / `,` / `!` / `}`）**逐字不动**——那一路由列表层
`VariableDeclarationListEndPossibleShape` 与既有候选各自负责。

**收口后的边界单元**由 `StatementShape.FinishShell` 的 leftover 重放**同一手法**交回父单元
（`ReplayLeftover`：先挂回父单元 `Data`，再逐格驱动父单元目录，让下一条语句在自己的那一格建壳）。

开关门控：全部判据都在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 内；开关关闭时本类一次都不返回
`true`，legacy 路径（`StatementBuilder` 原子建树）逐字节不变。

# class DeclarationAsiBoundary

## static field ReplayDepth:int = 0

重放深度：重放期间父目录自己又建出形状、再次回到本类时不递归重放（与 `StatementShape.LeftoverReplayDepth` 同一用途）。

```ts
0
```

## static method CanClose:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool

`units` 是**声明自己的 `Data`**（`let` 关键字已被语句层吃掉，所以段首是绑定标识符）。

`atEof = true` 一律 `false`：文件末尾那一格由 `EndOfFileTokenShape` 分支 `Accept`，真正的收口由外层
`SourceFileShape` / 块体对挂载单元 `TryToClose` 完成，不走本判据（否则任何一个「恰好是最后一个字符」的
单元都会被当成边界）。

```ts
// C4：开关门控。关闭时本类对所有格子都答「不能收口」，legacy 路径一行都不经过这里。
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (atEof) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken) {
  return false;
}
// 只在 `Common` 格生效（本 WP 的规格边界）：换行之后起一条新语句的那个单词（`let` / `b` / `if` …）。
// `Symbol` 格（`;` / `,` / `!` / 二元运算符 / `}`）逐字留给列表层与声明层的既有分支，本类不参与。
if (!(current instanceof Common)) {
  return false;
}
// 判据一：语句边界（与根表达式语句同一份实现，不新写 ASI 词法）。
// [A2-D2:BLOCK-HOST] 块体宿主：边界格是宿主块体的 `}`——`}` 是 `Bracket` 的结束括号、**不是**
// `units` 里的单元（它由深层的 `VariableDeclarationShape` 当符号吃掉），所以 `CanEndStatement`
// 看不到它。这一支只把「字符流里下一个显著字符就是宿主的 `}`」并进来，不新写第二套边界词法。
if (!DeclarationAsiBoundary.IsBlockHostBoundary(units, tokenIndex)) {
  if (!StatementBoundaryUtil.CanEndStatement(units, tokenIndex, false)) {
    return false;
  }
}
// 判据二：本条声明已经有可结束的形状（初始化器根已存在，或从未出现 `=` 且绑定已完整）。
return DeclarationAsiBoundary.HasClosableShape(units, tokenIndex);
```

## static method CanCloseAtLineBreak:(units:Array<Token>, tokenIndex:int)=>bool

**行尾格上的收口判据**：`tokenIndex` 是**本条声明的最后一个代码单元**，它后面只有空白 / 行终止符，
且下一行的第一个显著字符**起一个不续接的单词** ⇒ 在**这一格**收口。

为什么需要它（实测证据）：`CanClose` 只在「下一条语句的首代码单元」那一格成立，而那一格与下一条语句
token 关闭是**同一拍**（`let x = a` ⏎ `b` ⏎：`b` 在最后一个 `\n` 那一拍才关闭）。legacy 在同一拍里
已经原子建好整棵树，于是两边**打平**，分类停在 `partial`（`IdentifierShape@pos=7` 两边都是第 11 拍）。
在**行尾这一格**收口，声明尾部的原子建树就早 legacy 一拍 ⇒ `nonSkeletonEarlier > 0` ⇒ `incremental`。

**这不是第二套 ASI 词法**（三条判据各自复用既有实现）：

1. 尾部能收住表达式：`StatementBoundaryUtil.CanEndDeclarationTail`（唯一实现点，与
   `IsDeclarationFollowBoundary` / `StatementEndCode` 读同一份）；
2. 声明已经长到可以收口：`HasClosableShape`（本类，下面那一条）；
3. 下一行是否续接：**只做字符级否决**——下一行第一个显著字符必须是标识符起头（字母 / `_` / `$`），
   且不是续接词（`in` / `instanceof` / `as` / `satisfies`，即 `StatementTokenSets.IsExpressionContinuation`
   的 `Common` 分支那几个词）。其它一切（运算符 / `(` / `[` / `.` / 模板 / 数字 / 注释 / `;` / `}` / EOF）
   一律**不在这里收口**，留给 `Common` 格那条原判据——本判据只比它**早一拍**，判定结果一致。

拿不到文档（`SourceRange.CurrentDocument === null`，探针）时一律 `false`：保守，交下一格。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken) {
  return false;
}
// 必须就是本条声明的最后一个代码单元（这一格之后只剩 trivia）。
if (DeclarationAsiBoundary.LastCodeIndex(units, units.length) !== tokenIndex) {
  return false;
}
if (!StatementBoundaryUtil.CanEndDeclarationTail(units, tokenIndex)) {
  // [A2-D2:BLOCK-HOST] 块体宿主上的一个例外：初始化器**已经建出形状根**（`b.c` / `super.m` / `f()` / `1`）
  // 时，尾判据对非 basic 形状单元答 `false`（`CanEndExpressionAt` 只认 basic 单元的表达式尾）。
  // 这时「根是非 basic 形状」本身就是「初始化器已长完」的证据——与 `FinishIncremental` 的
  // `builtShape !== null` 同一条口径。这一句原本只覆盖块体宿主；root 上的同类证据由下面的
  // `[D2:TYPED-TAIL]` 补齐（同一个「已建形状 = 已长完」口径，边界来源从宿主 `}` 换成行尾 ASI）。
  //
  // [D2:TYPED-TAIL] **root 上的同一条证据**：带类型注解的声明在类型节点落地之后，`Data` 的末单元就是
  // 那个已建形状（`AnyKeywordShape` / `TypeReferenceShape` …），`CanEndDeclarationTail` 同样答 `false`。
  // 于是 `declare const s: unique symbol` ⏎ `type A = this` 永远不收口：声明把下一条语句吞进 `Data`，
  // 外层 `declare` 语句壳活到 EOF，与根终结候选同格 ⇒ `CatalogGuide: 终结候选与其它候选同时成立
  // （宿主 SourceFileShape）`（D2 的 41 条里有 11 条正是这条链）。
  // 「已建形状 + 字符流证明下一行起一条不续接的语句」= 类型 / 初始化器已经长完，与块体那一支同一口径，
  // 只是把边界来源从「宿主 `}`」换成「行尾 ASI」。判据仍是本类唯一一份（`StartsNewStatementLine`）。
  //
  // **只对带类型注解的声明生效**（`HasAnnotationShape`：`=` 之前已有注解形状）：普通初始化器的形状根
  // 在下一格由 `CanClose`（`CloseAtAsiBoundary`）收口，行为一个字都不改；放给它们会把「形状落地的那一拍」
  // 提前成收口拍，`undici-types/index.d.ts` 一类没换行的 d.ts 会因此掉节点（D2 实测 structural=14）。
  // **类型节点以闭括号收尾时也不走这一支**（`EndsWithClosingBracket`）：`declare const c: { … }` /
  // `: (A) => B` / `: T[]` 的右括号 / 右方括号之后紧跟下一条语句时，早收口会把下一条语句（尤其
  // `export { … }` 这种带括号的）并进声明里（D2 实测 `undici-types/index.d.ts` 少一条 export）。
  // 那一类仍走原来的「下一格 / 兜底」路径。
  const shapeTail = !current.IsBasicToken
    && DeclarationAsiBoundary.HasAnnotationShape(units)
    && !DeclarationAsiBoundary.EndsWithClosingBracket(current)
    && DeclarationAsiBoundary.StartsNewStatementLine(current);
  if (!shapeTail && (!DeclarationAsiBoundary.IsBlockHostBoundary(units, tokenIndex) || current.IsBasicToken)) {
    return false;
  }
}
if (!DeclarationAsiBoundary.HasClosableShape(units, units.length)) {
  return false;
}
// [A2-D2:BLOCK-HOST] 块体宿主的边界格是宿主块体的 `}`：与「行尾 + 下一行起新语句」同一落点口径
// （声明最后一个代码单元那一格、边界单元之前），所以并进同一条早收口判据里。
return DeclarationAsiBoundary.StartsNewStatementLine(current)
  || DeclarationAsiBoundary.IsBlockHostBoundary(units, tokenIndex);
```

## static method IsBlockHostBoundary:(units:Array<Token>, tokenIndex:int)=>bool

[A2-D2:BLOCK-HOST] **块体宿主下的收口边界**：本格之后第一个显著字符就是宿主块体的结束括号 `}`。

为什么必须由字符流回答：块体里的声明挂载链是 `块体 Bracket ← statement ← list ← declaration`，`}` 到达时
最内层的 `declaration` 先把它当 `Symbol("}")` 吃进 `Data`（`Bracket.ExitOrPre` 要等挂载链卸完才轮到），
所以 `units` 里永远看不到这个 `}`——`CanEndStatement` / `IsAsiBoundary` 的 `}` 分支在块体宿主上一格都不成立。
`IsInitializerTailJudge` 与 `PrimaryAtomGuard.IsTerminalAfter` 同样只认 `;` / EOF，块内初始化器因此
永远等不到「长完」的那一拍。

**不是第二套边界词法**：本判据只回答「宿主是块体括号、且它的结束括号就在眼前」，与
`CanCloseAtLineBreak` 的字符级前瞻同源（跳过空白 / 行注释 / 块注释后取第一个显著字符）。
宿主由**挂载链**给出（`unit.Parent` 四级：declaration → list → statement → host），不看 `ctx.Text`。

- 宿主不是 `{` 括号（根 `SourceFileShape` / 类体以外的一切）⇒ `false`，root 路径一个字都不变；
- 宿主是 `{` 括号但下一个显著字符不是它的结束括号（`if (a) { let y = b.c + 1 }` 的 `+`）⇒ `false`；
- 文档不可用（探针没设 `CurrentDocument`）⇒ `false`（保守：判不出边界就交下一格）。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const current = units[tokenIndex];
if (current.IsTriviaToken) {
  return false;
}
const host = DeclarationAsiBoundary.BlockHost(current);
if (host === null) {
  return false;
}
return DeclarationAsiBoundary.NextCodeChar(current) === (host as Bracket).EndBracketChar;
```

## static method BlockHost:(unit:Token)=>Token | null

[A2-D2:BLOCK-HOST] 由**挂载链**取声明的宿主：`unit.Parent`（declaration）→ list → statement → host。
返回 `null` 表示宿主不是块体 `{` 括号（root 的 `SourceFileShape`、类体 / 接口体等都不算）。

```ts
let owner = unit.Parent;
if (owner === null || owner.Parent === null || owner.Parent.Parent === null) {
  return null;
}
const host = owner.Parent.Parent.Parent;
if (host === null) {
  return null;
}
if (!(host instanceof Bracket)) {
  return null;
}
return (host as Bracket).StartBracketChar === "{" ? host : null;
```

## static method NextCodeChar:(unit:Token)=>string

`unit` 之后第一个显著字符（跳过空白 / 行注释 / 块注释）；EOF 或文档不可用返回 `""`。
与 `InitializerTailJudge` / `PrimaryAtomGuard.IsTerminalAfter` 的前瞻同一套字符口径。

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return "";
}
let at = unit.SourceRange.EndIndex;
if (at < 0) {
  return "";
}
const count = document.GetCount();
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v" || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = document.GetRaw(at + 1, at + 2);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetRaw(at, at + 1) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetRaw(at, at + 1) === "*" && document.GetRaw(at + 1, at + 2) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
  }
  return ch;
}
return "";
```

## static method EndsWithLineBreak:(unit:Token)=>bool

trivia 单元的**最后一个字符**是行终止符（`\r` / `\n` / U+2028 / U+2029）。与
`ExpressionStatementPossibleShape.HasLineBreak` 的判据同源，但只认「结尾」——中间带换行的块注释
之后同一行还有代码，不能当 ASI 边界。

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const end = unit.SourceRange.EndIndex;
if (end <= 0) {
  return false;
}
const last = document.GetRaw(end - 1, end);
return last === "\n" || last === "\r" || last === "\u2028" || last === "\u2029";
```

## static method LastCodeIndex:(units:Array<Token>, tokenIndex:int)=>int

`tokenIndex` 之前最后一个非 trivia 单元的下标；没有返回 `-1`。

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static field ContinuationWords:Array<string> = ["in", "instanceof", "as", "satisfies"]

续接**词**闭集（`StatementTokenSets.IsExpressionContinuation` 的 `Common` 分支同样是这几个词；
该闭集只有 `Token` 入口，字符级前瞻拿不到 token，所以这里抄一份**词表**并在报告里登记：
若出现第三个字符级消费者，应把 `IsExpressionContinuationText` 加进 `StatementTokenSets`，
本表随之删除）。

```ts
["in", "instanceof", "as", "satisfies"]
```

## static method StartsNewStatementLine:(unit:Token)=>bool

`unit` 之后**至少跨过一个行终止符**，且下一行的第一个显著字符**起一条新语句**（只看字符，不看 token）：

- 跳过空白；必须遇到行终止符（否则同一行后面还有代码，不是 ASI 边界）；
- EOF ⇒ `false`（EOF 收口由外层 `TryToClose` 负责，不抢那一拍）；
- **注释不算「显著字符」**：下一行以 `//` / `/*` 开头时跳过注释（含它自己的行终止符）继续找，
  与 `NextCodeChar` / `InitializerTailJudge` 的前瞻同一套字符口径（[D2:COMMENT]，见下）；
- 首个显著字符不是标识符起头（字母 / `_` / `$`）⇒ `false`
  （`+` / `(` / `[` / `.` / 模板 / 数字 / 运算符…都可能续接，一律留给下一格的原判据）；
- 读出整个单词，命中续接词闭集 ⇒ `false`。

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return false;
}
const end = unit.SourceRange.EndIndex;
if (end < 0) {
  return false;
}
const count = document.GetCount();
let at = end;
let crossedLineBreak = false;
while (at < count) {
  const ch = document.GetRaw(at, at + 1);
  if (ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029") {
    crossedLineBreak = true;
    at += 1;
    continue;
  }
  if (ch === " " || ch === "\t" || ch === "\f" || ch === "\v") {
    at += 1;
    continue;
  }
  // [D2:COMMENT] 下一行的第一个显著字符是注释：注释不是语句起点，跳过它（以及它自己的行终止符）
  // 再继续找。`declare const s: unique symbol` ⏎ `// c` ⏎ `type A = this` 就是死在这一格——
  // 不跳注释 ⇒ 判不出「下一行起新语句」⇒ 带类型注解的声明吞掉下一条语句，到 EOF 变成根层双 Accept。
  // 字符口径与 `NextCodeChar` 同源（跳过 `//` 到行尾、跳过 `/* … */`）。
  if (ch === "/" && at + 1 < count) {
    const next = document.GetRaw(at + 1, at + 2);
    if (next === "/") {
      at += 2;
      while (at < count && document.GetRaw(at, at + 1) !== "\n") {
        at += 1;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (document.GetRaw(at, at + 1) === "*" && document.GetRaw(at + 1, at + 2) === "/") {
          at += 2;
          break;
        }
        at += 1;
      }
      continue;
    }
  }
  break;
}
if (!crossedLineBreak || at >= count) {
  return false;
}
const first = document.GetRaw(at, at + 1);
const isLetter = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z");
if (!isLetter && first !== "_" && first !== "$") {
  return false;
}
let word = "";
let scan = at;
while (scan < count) {
  const ch = document.GetRaw(scan, scan + 1);
  const chIsLetter = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
  if (!chIsLetter && !(ch >= "0" && ch <= "9") && ch !== "_" && ch !== "$") {
    break;
  }
  word += ch;
  scan += 1;
}
return !DeclarationAsiBoundary.ContinuationWords.includes(word);
```

## static method HasAnnotationShape:(units:Array<Token>)=>bool

本条声明的 `=` **之前**是否已经有一个**已建形状**（`const x: T` 的注解节点、`let x!: T` 的定值
`!` 之后的注解节点）。只看第一个 `=` 之前，且跳过第一个代码单元（绑定本身）：
`=` 之后的形状是初始化器根，不属于注解。

**为什么不用 `HasAnnotationColon`**：注解落地之后 `Data` = `[IdentifierShape, TypeNode]`，那个 `:`
已经被 `TryBuildAnnotation` 消费掉——按「有没有 `:`」判会漏掉所有已经落地的注解（D2 实测会把
`declare const s: unique symbol` 一类重新打回 SourceFileShape 双 Accept）。按「`=` 之前有第二个
非 basic 形状」判，落地前后都成立。

只用于 [D2:TYPED-TAIL] 的分流（带注解的声明允许「已建形状 + 行尾」提前收口），不参与任何建树。

```ts
let code = 0;
for (let at = 0; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  if (units[at] instanceof Symbol && (units[at] as Symbol).Is("=")) {
    return false;
  }
  code += 1;
  if (code >= 2 && !units[at].IsBasicToken) {
    return true;
  }
}
return false;
```

## static method EndsWithClosingBracket:(unit:Token)=>bool

`unit` 的源码区间最后一个字符是不是 `}` / `)` / `]`（类型字面量 / 函数类型 / 数组 / 元组收尾）。
[D2:TYPED-TAIL] 的分流用：这类类型节点之后早收口会把下一条语句并进声明，所以不早收。

拿不到文档时返回 `true`（保守：不早收，交下一格）。

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return true;
}
const end = unit.SourceRange.EndIndex;
if (end <= 0) {
  return true;
}
const last = document.GetRaw(end - 1, end);
return last === "}" || last === ")" || last === "]";
```

## static method HasClosableShape:(units:Array<Token>, tokenIndex:int)=>bool

「声明是否已经长到可以收口」只看 `units` 里**非 trivia 单元的个数与种类**，不读源码文本（C2 口径）：

- 段首（第一个非 trivia 单元）是绑定：标识符 / 解构括号 / 已建好的绑定形状；
- 段首之后、`tokenIndex` 之前第一个 `Symbol("=")` 就是初始化器起点；
- 没有 `=` ⇒ 绑定 + 可选类型注解 + 可选 `!` 已经是完整声明（`let x` / `let x: T` / `let x!: T`）；
- 有 `=` ⇒ 初始化器里必须已经有**代码单元**（非空）。这一条只是「初始化器不为空」的下界：
  「最后一个代码单元能不能收住表达式」由判据一（`CanEndStatement` → `IsAsiBoundary` →
  `CanEndExpressionAt` / `IsPostfixBangTail` / 闭合 `{}`）负责，这里**不重写第二份**。

**为什么不用「`=` 之后必须有已建好的形状（`builtShape` 非空）」做判据**：E-base 目录还没有把
字符串 / 正则 / 数字全部接管（实测 `let x = "s"` 的 `Data` 里 `String` 仍是 raw basic 单元，
`FinishIncremental` 走的是 `ExpressionBuilder` 原子降级路径，与 legacy 同树）。若要求已建形状，
本 WP 的目标 case（`let x = "s"`）永远收不了口；而「raw basic 初始化器」的收口安全性由
`FinishIncremental` 自己保证（`builder.At !== builder.Units.length` ⇒ 显式 `throw`，不会静默产出错树）。

```ts
let first = -1;
let equalAt = -1;
for (let at = 0; at < tokenIndex && at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (first < 0) {
    first = at;
    continue;
  }
  if (equalAt < 0 && unit instanceof Symbol && (unit as Symbol).Is("=")) {
    equalAt = at;
  }
}
if (first < 0) {
  // 还没有任何代码单元：连绑定都没到，不能收口。
  return false;
}
if (equalAt < 0) {
  return true;
}
for (let at = equalAt + 1; at < tokenIndex && at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return true;
  }
}
return false;
```

## static method ReplayLeftover:(host:Token, units:Array<Token>, context:SyntaxContext)=>void

把**边界单元**交回父单元并在它自己的那一格重放（与 `StatementShape.FinishShell` 的 leftover 重放同一手法）。

调用前，边界单元已经按序插回 `host.Data`（紧跟收口后的语句）；这里只做两件事：

1. 逐格取它在 `host.Data` 里的**当前位置**（前面的格子可能已被父目录搬进某条形状，所以每次重查）；
2. 驱动父单元目录 `ComputePossibleShapesByIndex`，让下一条语句在自己的那一格建壳。

父目录拒收 / 抛错就停在这里（尽力而为，与 `FinishShell` 同口径）：后面的格子照旧交给 EOF / fallback 路径，
**不**在这里把异常吞成错树。

```ts
if (host === null) {
  return;
}
const owner = host as unknown as ShapeToken;
const guide = owner.CatalogGuide;
if (guide === null) {
  return;
}
if (DeclarationAsiBoundary.ReplayDepth > 0) {
  return;
}
DeclarationAsiBoundary.ReplayDepth += 1;
try {
  for (const unit of units) {
    if (unit.IsTriviaToken) {
      continue;
    }
    const at = host.Data.indexOf(unit);
    if (at < 0) {
      // 这一格已经被前一次重放建进某条形状里（父目录消费了它），跳过。
      continue;
    }
    try {
      guide.ComputePossibleShapesByIndex(host, at, context);
    } catch {
      break;
    }
  }
} finally {
  DeclarationAsiBoundary.ReplayDepth -= 1;
}
```
