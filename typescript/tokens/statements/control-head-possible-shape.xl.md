# dependencies
```xl
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { NumericLiteralShape } from "../literals/numeric-literal-shape.xl.md"
import { BracketRole } from "./bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "./bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "./bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
```

# namespace cangjie

# class ControlHeadScan

一只控制流头括号的扫描状态（`Host` 是那只 `(` 的 `Data` 数组对象，与
`ParameterListPossibleShape.States` 同一手法：按数组对象登记，括号被丢弃时随之一并失效）。

## field Host:Array<Token> | null = null

## field Keyword:string = ""

括号前面的控制流关键字（`if` / `for` / `while` / `switch` / `with`）；空串 = 认不出来。

## field Enabled:bool = false

这只括号是否归本目录（见 `ControlHeadPossibleShape.Decide`）。`false` 时一格都不建，
括号内容**逐字节保持 raw**，交 legacy 收口。

## field Atoms:int = 0

本括号已经逐字建出的头原子个数。

# class ControlHeadPossibleShape extends PossibleShape

**控制流头 `(` 的头候选（B3）。**

`if (` / `for (` / `while (` / `switch (` / `with (` 的 `(` 在创建格由
`BracketRoleResolver` 判成 `BracketRole.ControlHead`（`bracket-role-resolver.xl.md` 的 `Classify`
里既有的那一条），`BracketCatalogInstaller.Install` 给它装
`CatalogGuide([ControlHeadPossibleShape], WaitingEndPossible)`。之后括号里**每个 basic token 关闭时**
`CatalogGuide` 问本候选一格（建完 `Reset`，下一格从头判），命中的就**就地建出那一格的头原子**：

| 头里的单元 | 建出的形状 | 判据 |
|---|---|---|
| 普通标识符 `i` / `args` | `IdentifierShape` | 标识符字面形态 + 不在保留字表里 |
| 数字字面量 `0` / `3` | `NumericLiteralShape` | `Common.IsNumber()` 且不是 BigInt |
| `=` / `<` / `++` / `;` / `,` / `.` 等符号 | **不建**（保持 raw `Symbol`） | 符号位一律留给 legacy 的表达式解析 |
| `let` / `const` / `new` / `typeof` / `this` / `null` … | **不建**（保持 raw `Common`） | 见 `Reserved` / `StatementRouteUtil.IsLegacyKeyword` |

**为什么只建「非符号」的原子**：控制流头的内容是表达式（A2 的领地）。符号位一旦提前变成
`EqualsTokenShape` / `LessThanTokenShape`，legacy 的 `ParseAssign` / `ParseBinary` 就再也认不出运算符
（`IsText` 只认 `Common` / `Symbol`），等价于「A2 的表达式目录还没就绪就先自建半套」——
`_reports/BRACKET-A1.md` §WP-B3 明令禁止。标识符 / 数字字面量在 legacy 侧走的是
`ExpressionBuilder.ParsePrimary` 的**同一个建树点**，所以本候选建出的原子与 legacy 在收口格会建的
**是同一类、同一 `Pos` 口径**的节点：legacy 认出原子就直接消费（`ParsePrimary` 的
`ControlHeadPossibleShape.IsAtom` 分支），不二次重建。

**为什么不会把候选判死**：`ComputeByIndex` 永远 `Uncertain`（既不 `Accept` 也不 `Reject`），
`IsBuildable` 只在「这一格确实是可建的头原子」时为真。于是 `Candidates.size === 1` 恒成立，
`CatalogGuide` 的两条抛错出口（「终结候选与其它候选同时成立」/「没有候选形状可以构成」）都不可达
——`EndPossible` 是永不 `Accept` 的 `WaitingEndPossible`。

**`for` 头的两条闸**（`Decide`）：

1. 声明式头（`for (let …)` / `for (const …)` / `for (var …)` / `for (using …)` / `for await …`）
   **整只括号都不建**：初始化段由 legacy `BuildVariableDeclarationList` 逐字读，半建的标识符会让它
   读不到 `Common`；
2. 三段式头与 `for (x of y)` 的绑定段归本目录；`of` / `in` 关键字本身**不是**标识符（在 `Reserved`
   里），保持 raw，`BuildFor` 的 for-in/of 判据因此不变。

**`catch (e)` / `try` / `else` 不归本目录**：`catch (` 的参数位是绑定模式，由 legacy 建形态；
`Decide` 对 `Keywords` 之外的关键字一律 `Enabled = false`，一格都不建。

## static field States:Array<ControlHeadScan> = []

按括号 `Data` 数组对象登记的状态。

## static field Atoms:Set<any> = new Set()

本进程内由本候选建出的头原子（`ParsePrimary` 用它认「这是已建的头原子」）。
`SourceFileShape` 的构造器每解析一个文件清一次空，不跨文件增长。

## static field CatalogRegistered:bool = false

## static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static field Keywords:Array<string> = ["if", "for", "while", "switch", "with"]

本候选认的控制流头关键字。

## static field Reserved:Array<string> = ["new", "delete", "typeof", "void", "this", "super", "null", "true", "false", "function", "class", "async", "await", "yield", "in", "of", "instanceof", "import", "export", "let", "const", "var", "using", "static", "get", "set", "type", "declare", "abstract", "extends", "implements", "as", "satisfies", "keyof", "is", "infer", "asserts", "unique", "readonly", "namespace", "module", "enum", "interface"]

`Common` 里**不能被当成普通标识符**的词：这些位置 legacy 会建 `NewExpressionShape` /
`TypeOfExpressionShape` / `ThisKeywordShape` / `TrueKeywordShape` / 声明壳……一旦提前建成
`IdentifierShape`，收口格就再也回不去了。

## static method Shapes:()=>Array<PossibleShape>

目录里**唯一**的候选（进程内只建一份，与 `ParameterListPossibleShape.Shapes()` 同一纪律）。

```ts
if (ControlHeadPossibleShape.CreatePossibleShapesCache === null) {
  ControlHeadPossibleShape.CreatePossibleShapesCache = [new ControlHeadPossibleShape()];
}
return ControlHeadPossibleShape.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

把 `ControlHead` 角色目录注册进 `BracketRoleResolver`，幂等（只注册一次）。
注册之后 `Resolve` 对控制流头的 `(` 不再返回 `Fallback("catalog-not-registered:ControlHead")`，
而是 `Known` + 本候选。

```ts
if (ControlHeadPossibleShape.CatalogRegistered) {
  return;
}
ControlHeadPossibleShape.CatalogRegistered = true;
const catalog = new BracketRoleCatalog(BracketRole.ControlHead, ControlHeadPossibleShape.Shapes(), null);
catalog.FlushOnClose = true;
BracketRoleResolver.RegisterCatalog(catalog);
```

## static method ResetAtoms:()=>void

清空「已建头原子」的登记表与扫描状态。只清身份表，不动任何树的节点
（`SourceFileShape` 构造器每文件调一次）。

```ts
ControlHeadPossibleShape.Atoms = new Set();
ControlHeadPossibleShape.States = [];
```

## static method IsAtom:(unit:Token)=>bool

`unit` 是不是本候选建出来的头原子。legacy 的 `ParsePrimary` 只认这一条——
**不是**「所有 `ShapeToken`」：那样会把将来的语句壳 / 括号壳也当表达式起点吃进来。

```ts
if (unit === null) {
  return false;
}
// [B3b:LEGACY] 这里**不**再读模式开关：原子只由 `ControlHeadPossibleShape.BuildByIndex`
// 写入，而目录只在 `SourceFileShape` 的增量装配点注册；干净 legacy 解析里登记表每次
// 构造器都被 `ResetAtoms()` 清空，`IsAtom` 恒为 `false`，本分支一个字节都不改。
// 反过来在这里读 `IsIncrementalShapesEnabled()` 是错的：整文件兜底
// （`ParseCore(shell=false)`）会把开关临时压 false，而兜底这一趟目录仍然挂着、原子照样建，
// 加了闸就变成「原子建了但没人消费」→ `ParsePrimary` 抛「不支持的表达式起点」
// （B3b 实测：`tts/run.mjs` PASS 429 → FAIL 20）。模式闸只加在装配套一处。
return ControlHeadPossibleShape.Atoms.has(unit);
```

## static method FindState:(units:Array<Token>)=>ControlHeadScan | null

```ts
for (const state of ControlHeadPossibleShape.States) {
  if (state.Host === units) {
    return state;
  }
}
return null;
```

## static method IsPlainIdentifier:(text:string)=>bool

标识符字面形态：首字符字母 / `_` / `$`，其余为字母数字 / `_` / `$`。

```ts
if (text.length === 0) {
  return false;
}
const first = text.charAt(0);
if (!((first >= "a" && first <= "z") || (first >= "A" && first <= "Z")
  || first === "_" || first === "$")) {
  return false;
}
for (let at = 1; at < text.length; at++) {
  const ch = text.charAt(at);
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9")
    || ch === "_" || ch === "$") {
    continue;
  }
  return false;
}
return true;
```

## static method FirstCode:(units:Array<Token>)=>Token | null

`units` 里第一个非 trivia 单元；没有就 `null`。

```ts
for (const unit of units) {
  if (!unit.IsTriviaToken) {
    return unit;
  }
}
return null;
```

## static method HeadKeyword:(bracket:Token)=>string

括号**前面**的控制流关键字：宿主 `Data` 里这只括号之前最近的 `Common` 文本。
只看结构位（`Data` 里的下标 + `Common`），不扫源码文本、不看括号里的内容。

```ts
const parent = bracket.Parent;
if (parent === null) {
  return "";
}
const at = parent.Data.indexOf(bracket);
const from = at < 0 ? parent.Data.length - 1 : at - 1;
for (let index = from; index >= 0; index--) {
  const unit = parent.Data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Common) {
    return (unit as Common).TempToString();
  }
  return "";
}
return "";
```

## static method Decide:(bracket:Token)=>ControlHeadScan

这只括号归不归本目录（**唯一**的 site 判据）：`BuildByIndex` 先问它，
`Enabled === false` 就一格都不建。

```ts
const units = bracket.Data;
const known = ControlHeadPossibleShape.FindState(units);
if (known !== null) {
  return known;
}
const state = new ControlHeadScan();
state.Host = units;
state.Keyword = ControlHeadPossibleShape.HeadKeyword(bracket);
state.Enabled = false;
if (ControlHeadPossibleShape.Keywords.indexOf(state.Keyword) >= 0) {
  state.Enabled = true;
}
if (state.Enabled && state.Keyword === "for") {
  const first = ControlHeadPossibleShape.FirstCode(units);
  if (first !== null && first instanceof Common) {
    const text = (first as Common).TempToString();
    if (text === "let" || text === "const" || text === "var" || text === "using" || text === "await") {
      state.Enabled = false;
    }
  }
}
ControlHeadPossibleShape.States.push(state);
if (state.Enabled) {
  StatementRouteUtil.ControlHeadGuideCount += 1;
}
return state;
```

## static method AtomKind:(unit:Token)=>string

这一格能建出什么：`"identifier"` / `"number"` / `""`（不建）。
符号位、trivia、字符串 / 正则 / 模板一律 `""`——它们归 legacy 或 A2。

```ts
if (unit === null || unit.IsTriviaToken) {
  return "";
}
if (!(unit instanceof Common)) {
  return "";
}
const common = unit as Common;
if (common.IsNumber()) {
  if (common.IsBigInt()) {
    return "";
  }
  return "number";
}
const text = common.TempToString();
if (StatementRouteUtil.IsLegacyKeyword(text)) {
  return "";
}
if (ControlHeadPossibleShape.Reserved.indexOf(text) >= 0) {
  return "";
}
if (!ControlHeadPossibleShape.IsPlainIdentifier(text)) {
  return "";
}
return "identifier";
```

## static method PosAt:(units:Array<Token>, tokenIndex:int)=>int

`Pos` 口径：`units` 里 `tokenIndex` 之前**最近的**非 trivia 单元的 `End`；没有就用该单元自己的 `Start`。
与 `ExpressionBuilder.Load` 的 `Positions` 走法一致（trivia 不推进 `pos`）。

```ts
for (let index = tokenIndex - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  const end = unit.SourceRange.End;
  if (end >= 0) {
    return end;
  }
  break;
}
const own = units[tokenIndex];
if (own === undefined) {
  return -1;
}
return own.SourceRange.Start;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

永远 `Uncertain`：本候选既不 `Accept`（不触发建树）也不 `Reject`（不参与候选淘汰）。
它是不是「这一格该建」由 `IsBuildable` 回答，`CatalogGuide` 因此**永远剩下这一个候选**，
两条抛错出口都不可达（见类注释）。

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

这一格能不能现在建：是 trivia / 符号 / 保留字就 `false`（让目录继续等下一格）。

`host` 不在形参里，所以这里**只**问 `AtomKind`，不信任何 site 状态——site 判据
（`Decide` 的 `Enabled`）在 `BuildByIndex` 里把关，两边不重复。

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
return ControlHeadPossibleShape.AtomKind(units[tokenIndex]) !== "";
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把 `host.Data[tokenIndex]` 那一个 basic 单元**原地**换成头原子（`Replace`，位置不变）：

- `SourceRange` 由 `IdentifierShape.FromBasicToken` / `NumericLiteralShape.FromBasicToken` 从 basic 单元取；
- `Pos` 按 `PosAt`（前一个非 trivia 单元的 `End`），与 legacy `ExpressionBuilder.ParsePrimary` 的
  `shape.Pos = this.Positions[start]` 逐字节相同；
- 建完把原子记进 `Atoms`，legacy 的 `ParsePrimary` 靠这张表认它。

不建的情况（`Decide.Enabled === false` 或 `AtomKind === ""`）**什么都不改**：
`host.Data[tokenIndex]` 保持原样，返回原单元。

```ts
const token = host.Data[tokenIndex];
if (token === undefined) {
  return token;
}
const state = ControlHeadPossibleShape.Decide(host);
if (!state.Enabled) {
  return token;
}
const kind = ControlHeadPossibleShape.AtomKind(token);
if (kind === "") {
  return token;
}
const common = token as Common;
let built:ShapeToken;
if (kind === "number") {
  built = NumericLiteralShape.FromBasicToken(common, context);
} else {
  built = IdentifierShape.FromBasicToken(common, context);
}
built.Pos = ControlHeadPossibleShape.PosAt(host.Data, tokenIndex);
ControlHeadPossibleShape.Atoms.add(built);
state.Atoms += 1;
StatementRouteUtil.ControlHeadAtomCount += 1;
common.Replace(built);
return built;
```
