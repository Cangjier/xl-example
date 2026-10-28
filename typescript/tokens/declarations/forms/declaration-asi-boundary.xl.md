# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
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
import { StatementScanner } from "../../statements/statement-scanner.xl.md"
```

# namespace cangjie

# class DeclarationAsiBoundary

## static field ReplayDepth:int = 0

```ts
0
```

## static method CanClose:(units:Array<Token>, tokenIndex:int, atEof:bool)=>bool

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
  if (!StatementBoundaryUtil.CanEndStatement(units, tokenIndex, false)
    && !DeclarationAsiBoundary.ShapeTailStartsStatement(units, tokenIndex)) {
    return false;
  }
}
// 判据二：本条声明已经有可结束的形状（初始化器根已存在，或从未出现 `=` 且绑定已完整）。
return DeclarationAsiBoundary.HasClosableShape(units, tokenIndex);
```

## static method CanCloseAtLineBreak:(units:Array<Token>, tokenIndex:int)=>bool

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
  // **类型节点以闭括号收尾时，收不收由「下一行起的是什么」决定**（`BlocksTypedTailClose`）：
  // D2 原来一律挡住 `}` / `)` / `]` 收尾的类型（`{ … }` 类型字面量、`: (A) => B`、`: T[]`），
  // 实测代价是 4 条 `declaration 声明体`：`declare const o: { m: … }` ⏎ `o.m ()` 的注解永远不收口，
  // 下一行的语句被 `FinishIncremental` 当成**第二个**注解形状 ⇒ 显式抛错。
  // 字符级闸不能回答「下一行是不是一条新语句」，所以换成词级判据：下一行起的词**不能**是
  // 会把类型 / 声明继续写下去的词（`BlockedAfterTypeClose`，目前只有 `export`——`undici-types/index.d.ts`
  // 的 `declare const cacheStores: { … }` ⏎ `export * from './util'` 早收后会静默产出少 14 个节点的错树）。
  // 判不出下一行的词（EOF / 注释后没有词 / 文档不可用）仍按保守口径挡住。
  const shapeTail = !current.IsBasicToken
    && DeclarationAsiBoundary.HasAnnotationShape(units)
    && !DeclarationAsiBoundary.BlocksTypedTailClose(current)
    && DeclarationAsiBoundary.StartsNewStatementLine(current);
  // [R18:YIELD-TAIL] 裸 `yield` 收尾：`yield` 是唯一「操作数可省略」的上下文关键字，尾判据
  // `CanEndDeclarationTail → CanEndExpression` 把 `yield` 当语句词排除 ⇒ 这一格永远答「收不住表达式」，
  // `const c = yield` ⏎ `const d = …` 于是收不了口。判据本身（`IsBareYieldTail`）与
  // `YieldFamilyEndCode` 的受限产生式同源，不新写 ASI 词法。
  const yieldTail = DeclarationAsiBoundary.IsBareYieldTail(units, tokenIndex);
  // [T10:ARROW-BLOCK-TAIL] 箭头函数**块体**的 `}` 收尾：下一行第一个显著字符是 `/` 时，那一行起的是
  // **一条新的正则语句**（TS 实测：`const v = () => { }` ⏎ `/re/g;` 是 `[0,19)` + `[19,26)` 两条语句），
  // 不是初始化器的除法续接。`CanEndDeclarationTail` 对裸 `{` 括号一律答 `false`（`CanEndExpression` 分不清
  // 块体与对象字面量），所以这里必须单独放行，否则声明会把下一行的正则吞进 `Data`，到 `;` 收口时
  // `FinishIncremental` 的原子建树抛「初始化器未读完」⇒ 整文件 fallback（T10 的目标族）。
  const arrowBlockTail = DeclarationAsiBoundary.ArrowBodyCloseStartsStatement(units, tokenIndex);
  if (!shapeTail && !yieldTail && !arrowBlockTail
    && (!DeclarationAsiBoundary.IsBlockHostBoundary(units, tokenIndex) || current.IsBasicToken)) {
    return false;
  }
}
if (!DeclarationAsiBoundary.HasClosableShape(units, units.length)) {
  return false;
}
// [A2-D2:BLOCK-HOST] 块体宿主的边界格是宿主块体的 `}`：与「行尾 + 下一行起新语句」同一落点口径
// （声明最后一个代码单元那一格、边界单元之前），所以并进同一条早收口判据里。
// [T10:ARROW-BLOCK-TAIL] 箭头块体 `}` + 下一行 `/` 与「下一行起一个不续接的单词」同类：
// 都是「这一格之后必然是另一条语句」，只是起点从单词换成正则。
return DeclarationAsiBoundary.StartsNewStatementLine(current)
  || DeclarationAsiBoundary.IsBlockHostBoundary(units, tokenIndex)
  || DeclarationAsiBoundary.ArrowBodyCloseStartsStatement(units, tokenIndex);
```

## static method IsBareYieldTail:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Common)) {
  return false;
}
if ((unit as Common).TempToString() !== "yield") {
  return false;
}
for (let at = tokenIndex + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  return StatementScanner.HasLineBreakBefore(units, at);
}
return true;
```

## static method ShapeTailStartsStatement:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (DeclarationAsiBoundary.HasAnnotationShape(units)) {
  return false;
}
const previous = DeclarationAsiBoundary.LastCodeIndex(units, tokenIndex);
if (previous < 0) {
  return false;
}
const tail = units[previous];
if (tail.IsBasicToken) {
  return false;
}
if (tail instanceof Bracket) {
  return false;
}
return DeclarationAsiBoundary.StartsNewStatementLine(tail);
```

## static method IsBlockHostBoundary:(units:Array<Token>, tokenIndex:int)=>bool

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

## static method ArrowBodyCloseStartsStatement:(units:Array<Token>, tokenIndex:int)=>bool

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (!(unit instanceof Bracket) || !(unit as Bracket).Closed) {
  return false;
}
if ((unit as Bracket).StartBracketChar !== "{") {
  return false;
}
const previous = DeclarationAsiBoundary.LastCodeIndex(units, tokenIndex);
if (previous < 0) {
  return false;
}
const head = units[previous];
if (!(head instanceof Symbol) || (head as Symbol).TempToString() !== "=>") {
  return false;
}
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
if (document.GetRaw(at, at + 1) !== "/") {
  return false;
}
if (at + 1 < count) {
  const next = document.GetRaw(at + 1, at + 2);
  if (next === "/" || next === "*") {
    return false;
  }
}
return true;
```

## static method BlockHost:(unit:Token)=>Token | null

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

```ts
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static field ContinuationWords:Array<string> = ["in", "instanceof", "as", "satisfies"]

```ts
["in", "instanceof", "as", "satisfies"]
```

## static method StartsNewStatementLine:(unit:Token)=>bool

```ts
const word = DeclarationAsiBoundary.NextLineWord(unit);
if (word === "") {
  return false;
}
return !DeclarationAsiBoundary.ContinuationWords.includes(word);
```

## static method NextLineWord:(unit:Token)=>string

```ts
const document = SourceRange.CurrentDocument;
if (document === null) {
  return "";
}
const end = unit.SourceRange.EndIndex;
if (end < 0) {
  return "";
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
  return "";
}
const first = document.GetRaw(at, at + 1);
const isLetter = (first >= "a" && first <= "z") || (first >= "A" && first <= "Z");
if (!isLetter && first !== "_" && first !== "$") {
  return "";
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
return word;
```

## static method HasAnnotationShape:(units:Array<Token>)=>bool

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

## static field BlockedAfterTypeClose:Array<string> = ["export"]

```ts
["export"]
```

## static method BlocksTypedTailClose:(unit:Token)=>bool

```ts
if (!DeclarationAsiBoundary.EndsWithClosingBracket(unit)) {
  return false;
}
const word = DeclarationAsiBoundary.NextLineWord(unit);
if (word === "") {
  return true;
}
if (DeclarationAsiBoundary.ContinuationWords.includes(word)) {
  return true;
}
return DeclarationAsiBoundary.BlockedAfterTypeClose.includes(word);
```

## static method HasClosableShape:(units:Array<Token>, tokenIndex:int)=>bool

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
      guide.ComputePossibleShapesByIndex(host, at, context, PossibleSource.Close);
    } catch {
      break;
    }
  }
} finally {
  DeclarationAsiBoundary.ReplayDepth -= 1;
}
```
