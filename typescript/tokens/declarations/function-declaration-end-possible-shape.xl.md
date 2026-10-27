# dependencies
```xl
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { TypeBuilder } from "../types/type-builder.xl.md"
import { BlockShape } from "../statements/block-shape.xl.md"
import { BodyGuideUtil } from "./body-guide-util.xl.md"
import { FunctionDeclarationShape } from "./function-declaration-shape.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DeclarationAsiBoundary } from "./forms/declaration-asi-boundary.xl.md"
import { StatementRouteUtil } from "../statements/statement-route-util.xl.md"
```

# namespace cangjie

```txt
function f() { }
             ^ 函数体闭合
function f(a: A): B;
                   ^ 无体声明在分号处结束
```

`FunctionDeclarationShape` 的**终结候选**（WP-B3b；照 `ClassDeclarationEndPossibleShape` 的同一模式）。
声明关键字格由 `FunctionDeclarationPossibleShape` 提前 `MountShell` 挂出壳，本候选在壳的 `CatalogGuide`
里回答「声明到哪里算结束」，然后在收口时用**同一批 legacy 建树函数**
（`FunctionDeclarationShape.FromUnits`）把壳里的 raw 单元建成 `FunctionDeclarationShape`，
再由 `BodyGuideUtil.FinishShell` 换回父单元 —— EOF 树因此与 legacy 逐节点一致。

与 class 的差别只有两处：

1. class 一定有类体 `{}`；function 可能是**无体声明**（`function f(): void;` / `declare function f(): void;`），
   所以 `;` 也是合法终点，且没有体的那种要按 `ambient` 口径建树（`FromUnits` 的第 5 个参数）；
2. `{` 只有是**函数体**时才算终点 —— 返回类型里的对象字面量（`function f(): { a: A }`）不能提前收口，
   判据用 `TypeBuilder.IsBodyBrace`（与 legacy 建树同一条）。

# class FunctionDeclarationEndPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

终点判据（任一成立即 `Accept`）：

- 已闭合的函数体 `{`（且 `TypeBuilder.IsBodyBrace` 认定它是体、不是返回类型里的对象字面量）；
- 已闭合的 `;`（`declare function f(): void;` / 重载签名 `function f(a: A): B;`）；
- EOF 哨兵（无分号的 ambient 声明）。

其余一律 `Reject`（壳继续等单元）。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// [B1b] 函数体 `{` 在创建格就被 `OpenFunctionBody` 包成 `BlockShape`：块壳闭合即声明结束。
// （只有函数体括号会这样包，返回类型里的对象字面量不会；所以不必再跑 `IsBodyBrace`。）
if (unit instanceof BlockShape) {
  return (unit as BlockShape).Closed ? ShapeStates.Accept : ShapeStates.Reject;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{" && (unit as Bracket).Closed) {
  if (TypeBuilder.IsBodyBrace(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";") && unit.Closed) {
  return ShapeStates.Accept;
}
// [W5:FUNCTION-ASI] 无体声明（`declare function …` / 重载签名）末尾**没有** `;`：只要本格之前
// 最后一条代码单元之后跨行起了一条**不续接**的新语句，就在这一格收口。
// 少了这一条，`declare function a(): void` ⏎ `declare function b(): void` 会把整份文件吞进
// 第一条声明（`undici-types` api / connector / global-dispatcher / global-origin 四个文件的全部差异）。
// 判据取「不含本格」的上一格；字符前缀与 `DeclarationAsiBoundary.CanCloseAtLineBreak` 同一份。
if (tokenIndex > 0) {
  let previous = -1;
  for (let at = tokenIndex - 1; at >= 0; at--) {
    if (!units[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous >= 0
    && !FunctionDeclarationEndPossibleShape.IsOpenTail(units[previous])
    && FunctionDeclarationEndPossibleShape.StartsNewDeclarationLine(units[previous])) {
    return ShapeStates.Accept;
  }
}
if (unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## static field StatementHeadWords:Array<string> = ["declare", "export", "import", "function", "class", "interface", "type", "enum", "namespace", "module", "global", "abstract", "async", "const", "let", "var", "using", "if", "for", "while", "do", "switch", "try", "throw", "return", "break", "continue", "debugger"]

```ts
["declare", "export", "import", "function", "class", "interface", "type", "enum", "namespace",
  "module", "global", "abstract", "async", "const", "let", "var", "using", "if", "for",
  "while", "do", "switch", "try", "throw", "return", "break", "continue", "debugger"]
```

## static field HeadContinuationWords:Array<string> = ["extends", "implements", "infer", "is", "asserts", "readonly", "unique", "keyof", "typeof", "new"]

[R16:DECL-ASI] 能**把函数声明的头部接着写下去**的下一行首词闭集（跨行换行不是 ASI 的那几个）：

- `extends` / `infer`：`function f<T` ⏎ `extends U>`、条件类型的 `A extends infer B`；
- `is` / `asserts`：`function g(x): asserts x` ⏎ `is string`（`gap-r931-asserts-is-newline` 那一族）；
- `implements`：类声明头（同一份判据服务 `class` 壳的邻居形态，保守起见一并列）；
- `readonly` / `unique` / `keyof` / `typeof` / `new`：类型位上的前缀运算符 / 修饰词。

**不复用 `StatementTokenSets.IsExpressionContinuation`**：那个闭集只回答「表达式能不能续接」
（`in` / `instanceof` / `as` / `satisfies`），这些词由 `DeclarationAsiBoundary.StartsNewStatementLine`
自己否决；上列这些是**声明头**的续接词，与该闭集不是同一个问题（闭集没有 `extends` / `is`）。

```ts
["extends", "implements", "infer", "is", "asserts", "readonly", "unique",
  "keyof", "typeof", "new"]
```

## static method StartsNewDeclarationLine:(unit:Token)=>bool

[W5:FUNCTION-ASI] 下一行是否起一条**新的声明 / 语句**。

[R16:DECL-ASI] 原判据只认 `StatementHeadWords` 的**首词闭集**（声明 / 语句关键字），于是
「声明头已经完整、下一行是一条**标识符起头**的表达式语句」这一格永远判不出边界：
`declare function f<T>(): T` ⏎ `f<string>;` 里壳把 `f < string > ;` 整条吞进 `FunctionDeclaration`，
终态少 `ExpressionStatement` / `ExpressionWithTypeArguments` / `Identifier` / `StringKeyword`
（`_reports/R8-basic-token-audit.md` #19；`function f(): T` ⏎ `f()` 同形）。`f` 不是关键字，
闭集里没有它，壳一路吃到 EOF，`BuildByIndex` 在无体（`ambient`）分支里把下一条语句丢掉。

判据分两层，两层都不是新写的边界词法：

1. 首词命中 `StatementHeadWords` ⇒ 是（原判据逐字保留，`declare` / `function` / `const` … 那一档不变）；
2. 否则读 `DeclarationAsiBoundary.StartsNewStatementLine`——**全仓唯一一份**「跨过一个行终止符 +
   下一行起一个不续接的单词」的字符级前瞻（`CanClose` / `CanCloseAtLineBreak` /
   `ShapeTailStartsStatement` 用的都是它），先否决 `HeadContinuationWords`（声明头的续接词）。

**开关门控保持原样**（`if (!StatementRouteUtil.IsIncrementalShapesEnabled()) return false`）：
这条判据服务的是「壳提前挂出、后续 raw 单元进壳」那条路（`FunctionDeclarationPossibleShape`
的 `MountShell` 分支，只在 `IsIncrementalShapesEnabled()` 里）；`--legacy` 档的原子建树
（`FromUnits` 一次建两条 / `SplitAt`）不走本候选，`wide-ast --legacy` 0/0/2 逐字不变。
**实测口径**：`EnableIncrementalShapes` 的默认值就是 `true`（`statement-route-util.xl.md`），
所以「默认 true 档」= 本判据生效的那一档 = `tshape-judge` / `wide-ast` / `tts` 的读数；
开关压回 `false` 的那一档（`--legacy`）在**修前就已经是 ok**（矩阵 §3 左列）。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
const word = DeclarationAsiBoundary.NextLineWord(unit);
if (word === "") {
  return false;
}
if (FunctionDeclarationEndPossibleShape.StatementHeadWords.includes(word)) {
  return true;
}
if (FunctionDeclarationEndPossibleShape.HeadContinuationWords.includes(word)) {
  return false;
}
return DeclarationAsiBoundary.StartsNewStatementLine(unit);
```

## static method IsOpenTail:(unit:Token)=>bool

[W5:FUNCTION-ASI] 上一格还在「等名字 / 等类型 / 等右操作数」时不是语句边界（排版换行，不是 ASI）：

- `function f(): {` ⏎ `a: A }` —— 上一格是未闭合的 `{` 括号（返回类型里的对象字面量）；
- `declare function f(a: A)` ⏎ … —— 上一格是未闭合的 `(` / `[` 括号；
- `declare const s =` ⏎ … 之类 —— 上一格是 `=` / `.` / `,` / `:` / 二元运算符；
- `function` / `declare` / `async` 之后换行只是排版。

已闭合的 `{`（函数体）、`;`、EO` 各自有自己的终结分支，不走这一格。

```ts
if (unit instanceof Bracket) {
  return !(unit as Bracket).Closed;
}
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  return symbol.Is("=") || symbol.Is(".") || symbol.Is(",") || symbol.Is(":")
    || symbol.Is("<") || symbol.Is("+") || symbol.Is("-") || symbol.Is("*") || symbol.Is("/")
    || symbol.Is("&") || symbol.Is("|") || symbol.Is("?") || symbol.Is("=");
}
if (unit instanceof Common) {
  const word = (unit as Common).TempToString();
  return word === "function" || word === "declare" || word === "async"
    || word === "new" || word === "extends" || word === "implements"
    || word === "is" || word === "asserts" || word === "keyof" || word === "typeof";
}
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

收口：把壳里的 raw 单元按 **legacy 同一批函数**建成 `FunctionDeclarationShape`，再换回父单元。

- 用 `shell` 当 `host` 调 `FromUnits`（壳的 `Data` 就是 `[function, …, 体/分号]`）；
- `ambient = 没有函数体`：无体声明（declare / 重载）按 ambient 口径放行「没有体也没有分号」的成员形；
  「有没有体」只看**末代码单元**（`BlockShape` / `IsBodyBrace` 认作体的闭合 `{`），见下方
  `[R13:MAPPED-IN-GENERIC]`；回扫整段 `Data` 会把返回类型 / 泛型实参里的 `{ … }` 误当成体；
- `fallbackPos = shell.Pos`：`FromUnits` 的 `Pos` 回扫在 `start === 0` 时扫不到前一格，用壳 `Pos` 兜底，
  与 legacy 的「前一个非 trivia 单元 `EndIndex`」逐位一致；
- EOF 哨兵不算代码单元（从 `code` 尾巴剥掉）。

```ts
const shell = host as FunctionDeclarationShape;
// [W5:FUNCTION-ASI] 收口格若是**下一条语句的第一个单元**（既不是 `;`、也不是已闭合的函数体、
// 也不是 EOF），本声明按它之前的最后一个代码单元建树，边界单元连同其后的 trivia 交回父单元重放
//（与 `IncrementalVariableDeclarationListBuilder.CloseAtAsiBoundary` 同一手法）。
let boundary = -1;
const closingUnit = shell.Data[shell.Data.length - 1];
if (!(closingUnit instanceof EndOfFileTokenShape)
  && !(closingUnit instanceof Symbol && (closingUnit as Symbol).Is(";"))
  && !(closingUnit instanceof BlockShape)
  && !(closingUnit instanceof Bracket && (closingUnit as Bracket).StartBracketChar === "{" && (closingUnit as Bracket).Closed)) {
  boundary = shell.Data.length - 1;
}
const leftover:Array<Token> = boundary >= 0 ? shell.Data.slice(boundary) : [];
let lastCode = boundary >= 0 ? boundary - 1 : shell.Data.length - 1;
while (lastCode >= 0) {
  const candidate = shell.Data[lastCode];
  if (candidate.IsTriviaToken || candidate instanceof EndOfFileTokenShape) {
    lastCode--;
    continue;
  }
  break;
}
if (lastCode < 0) {
  return shell;
}
// [R13:MAPPED-IN-GENERIC] 「有没有体」= **本声明是否以函数体收尾**，不是「沿途出现过 `{`」。
// 原扫描把壳里**任意**已闭合的 `{` 都算成体：`declare function f(): Promise<{ -readonly [P in keyof T]: T[P] }>`
// 停在文件末尾时，泛型实参槽里的映射类型括号（`{ … }`）被误判成函数体 ⇒ `ambient=false`
// ⇒ `FromUnits` 在末单元是 `>`（既不是体、也不是 `;`）时抛「函数声明缺少函数体或分号」
// ⇒ R9 的 EOF 收口退回基类、整条声明留在 raw 记号上。泛型实参槽本身能建（带 `;` 的同一个写法 ok，
// `type X = Promise<{ … }>` 也 ok），首跳就在这一次 `ambient` 判定。
// 判据与 `FromUnits` 建树时**同一份**：`{` 只有 `TypeBuilder.IsBodyBrace` 认它是体才算体
//（`function f() {}` 的 `{` 前是 `)` → 是体；返回类型 / 泛型实参里的 `{` 前是 `:` / `<` / `,` → 不是体）。
// 只有末代码单元可能是体，所以只问 `lastCode` 这一格，不再回扫整个 `Data`。
const tailUnit = shell.Data[lastCode];
const hasBody = tailUnit instanceof BlockShape
  || (tailUnit instanceof Bracket && (tailUnit as Bracket).StartBracketChar === "{" && (tailUnit as Bracket).Closed
    && TypeBuilder.IsBodyBrace(shell.Data, lastCode));
const built = FunctionDeclarationShape.FromUnits(shell, 0, lastCode, context, !hasBody, false, shell.Pos);
const parent = shell.Parent;
BodyGuideUtil.FinishShell(host, shell, built);
// [XL-B3f] 无体声明的 `;` 归属（B3d 定位的 divergent 根因）：壳在 `;` 那一格挂出时，`;` 的关闭
// 还可能让父单元留下一个**零宽**的同名 Symbol（src 为 [x,x)，未真正签入源码）。legacy 的
// `;` 已经作为 FunctionDeclaration 的终止单元被收下，这个残片必须清掉 —— 否则 EOF 树多一个兄弟节点
// = divergent。只删「同名 + 零宽」的残片，真实空语句 `;`（src 有宽度）不动。
if (parent !== null) {
  for (let at = parent.Data.length - 1; at >= 0; at--) {
    const sibling = parent.Data[at];
    if (!(sibling instanceof Symbol)) {
      continue;
    }
    if ((sibling as Token) === (built as Token)) {
      continue;
    }
    if (!(sibling as Symbol).Is(";")) {
      continue;
    }
    const start = sibling.SourceRange.Start;
    const end = sibling.SourceRange.End;
    if (start >= 0 && end >= 0 && start === end) {
      parent.Data.splice(at, 1);
      break;
    }
  }
}
// [W5:FUNCTION-ASI] 边界单元（下一条语句的开头）挂回父单元并重放，让下一条声明在自己的那一格建树。
if (parent !== null && leftover.length > 0) {
  const builtAt = parent.Data.indexOf(built);
  if (builtAt >= 0) {
    for (let index = 0; index < leftover.length; index++) {
      leftover[index].Parent = parent;
      parent.Data.splice(builtAt + 1 + index, 0, leftover[index]);
    }
    parent.MountedUnit = null;
    DeclarationAsiBoundary.ReplayLeftover(parent, leftover, context);
  }
}
return built;
```
