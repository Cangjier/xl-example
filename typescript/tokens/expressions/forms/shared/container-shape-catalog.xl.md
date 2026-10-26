# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { BracketClosedHook } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { ShapeToken } from "../../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { BracketRole } from "../../../statements/bracket-role-resolver.xl.md"
import { BracketRoleState } from "../../../statements/bracket-role-resolver.xl.md"
import { StatementRouteUtil } from "../../../statements/statement-route-util.xl.md"
import { ExpressionAtomRegistry } from "./expression-atom-registry.xl.md"
```

# namespace cangjie

**B4e / K1：容器 shape 的「创建格」= 括号关闭格（父单元问完之后）。**

`{` / `[` / `(` 关闭的那一拍，`Bracket.Close` 先问父单元（A4 对象 / A4b 数组·括号 / P1 调用 /
P4 分组这些既有收口方按自己的所有权消费括号），然后调用 `BracketClosedHook`（B4e）。
本文件就是那个钩子的**唯一实现**（`ContainerShapeCloseHook`）：**只有父单元没有消费这只括号**时，
才用 legacy `ExpressionBuilder` 把它建成容器形状、登记、顶替。

| 角色（`Bracket.Role`） | 关闭格上建出的容器 | 谁在收口格消费 |
|---|---|---|
| `ObjectLiteral` | `ObjectLiteralExpressionShape` | `ParsePrimary`（`HasContainer`）/ `FinishIncremental` 的唯一根 |
| `ArrayLiteral` | `ArrayLiteralExpressionShape` | 同上 |
| `ParenExpression` | `ParenthesizedExpressionShape` | 同上 |
| `CallArgs` | `CallExpressionShape`（含 callee） | 同上 |

**为什么排在父单元之后**：在父单元**之前**换掉括号会把 A4/A4b/P1/P4 整族候选跳过，而那些候选
不只是建树的竞争者，还是「右操作数封口 / 在飞单元卸载」的收口方。实测 `let w = 1 * (a + b);`
会因此让 `BinaryExpressionShape` 永不封口，`;` 落进二元形状的 `Data`，`CatalogGuide` 抛
「没有候选形状可以构成」。排在之后就没有这个问题：既有收口方先跑，本钩子只补它们不要的那一半
（`_reports/B4e.md` §4）。

**为什么不新增第二棵建树路径**：建树用的仍然是 legacy 的 `ExpressionBuilder`
（`ParsePrimary` → `ParseObjectLiteral` / `ParseArrayLiteral` / `ParseBracketExpression`，
`CallArgs` 是 `ParsePostfix`），本文件只做三件事：把**已经攒好的父单元 `Data`** 交给它、
把消费掉的那一段 `Data` 换成它返回的形状、把形状登记进 `ExpressionAtomRegistry.Containers`。
于是 `Pos` / `src` / 子节点顺序与 legacy 收口格逐位相同（同一份 `Positions` 口径），
而收口路径看到的是容器形状而不是括号——**所有权切换**由登记表完成，收口不再重建。

**Deferred `ArrowParams` 的另一半**：初始化器 / 元素位 / 实参位的 `(` 在创建格分不出「分组」与
「箭头形参表」，B4b 因此只登记 `Deferred`（`_reports/B4b.md` §5.2）。关闭格是最后一次能分开的
时机：`ArrowAhead` 为假（闭括号之后不是 `=>` / `:`）就是分组括号，按 `ParenExpression` 建；
为真就原样让给 B4d 的 replay。

**槽位**：`{` / `[` / `(` 的槽位就是括号自己的那一格；`CallArgs` 的槽位**前移到 callee 的第一格**
（`f(1,2)` 的 `f` 与 `(` 一起被 `CallExpressionShape` 顶替，`f` 不再是父单元的子单元）。

**闸**：`StatementRouteUtil.EnableContainerShape`（B4i 起默认 `true`；开关关闭时与 base 逐位相同，
读数见 `_reports/B4i.md`）且增量模式；`OnBracketClosed` 里再检查一次（同一进程里两种模式可以交替）。
legacy 档 `Current` 即使被上一次增量解析装上，本钩子也立即返回、一个字节不改。

**位置闸（B4i）**：`RoleMatchesBracket` / `ArrowAhead` / `SequelAllowsBuild`（`<` / 反引号）/
`InsideArrowTail` / `InsideNewExpression` / 后缀 `[` —— 这些格子的所有权归 legacy
（`NewExpression`、箭头原子的建树、`ParsePostfix` 的模板 / 实例化后缀、数组绑定），
本机制**不建**并计入 `RefusedCount`。`IsSafeHost` 仍只有 `VariableDeclarationShape`。

# class ContainerShapeCatalog

## static field Installed:bool = false

本钩子是否已经挂到 `BracketClosedHook.Current` 上（只用于探针断言）。

## static field BuildCount:int = 0

真正被容器 shape 顶替掉的括号数（四族合计；`StatementRouteUtil.ContainerShapeBuildCount` 同步 +1）。

## static field RefusedCount:int = 0

关闭格上**放弃**建容器的次数（角色不认识 / 位置算不出 / legacy 解析不完 / 抛错）。
放弃 = 括号原样留给 legacy 收口，不是错误：宁可少建，不可建错。

## static field AlreadyConsumedCount:int = 0

父单元在关闭那一拍**已经**把括号换成形状（A4 / A4b / P1 / P4 的正常所有权）的次数。
本机制不参与那一格，只记账。

## static method EnsureInstalled:()=>void

幂等装配点（`SourceFileShape` 构造器每文件一次）。开关为假或非增量模式时**什么都不做**；
`BracketClosedHook.Current` 已被别的实现占用时**不覆盖**。

```ts
if (!StatementRouteUtil.EnableContainerShape) {
  return;
}
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (BracketClosedHook.Current !== null) {
  return;
}
BracketClosedHook.Current = new ContainerShapeCloseHook();
ContainerShapeCatalog.Installed = true;
```

## static method IsExpressionRole:(role:string)=>bool

四族角色的唯一判据（角色名来自 `BracketRole` 的字符串常量；这里不重新判一次角色）。

```ts
return role === BracketRole.ObjectLiteral || role === BracketRole.ArrayLiteral
  || role === BracketRole.CallArgs || role === BracketRole.ParenExpression;
```

## static method ArrowAhead:(bracket:Bracket)=>bool

`bracket` 的闭括号之后（跳过空白与注释）紧跟 `=>`，或者紧跟 `:`（可能是
`(a): T => …` 的返回类型标注）⇒ 它是箭头形参表，本机制**不建**，留给 B4d 的 Deferred replay。
`:` 一律让路（宁可少建：`(a): T => a` 不能被当成分组）。

```ts
const text = ContainerShapeCatalog.NextCodeText(bracket, 2);
if (text === "") {
  return false;
}
return text === "=>" || text[0] === ":";
```

## static method NextCodeText:(bracket:Bracket, length:int)=>string

闭括号之后（跳过空白与注释）的前 `length` 个字符；没有（EOF / 文档不可用）返回 `""`。
**位置判据的唯一字符前瞻入口**：`ArrowAhead` 与 `SequelAllowsBuild` 读同一份，不各写一遍。

```ts
const range = bracket.SourceRange;
if (range.Document === null || range.End < 0) {
  return "";
}
let at = range.End;
const count = range.Document.GetCount();
while (at < count) {
  const ch = range.Document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = range.Document.GetValue(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && range.Document.GetValue(at) !== "\n") {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count) {
        if (range.Document.GetValue(at) === "*" && range.Document.GetValue(at + 1) === "/") {
          at += 2;
          break;
        }
        at++;
      }
      continue;
    }
  }
  break;
}
let text = "";
for (let index = at; index < count && text.length < length; index++) {
  text += range.Document.GetValue(index);
}
return text;
```

## static method SequelAllowsBuild:(bracket:Bracket)=>bool

[B4i:SEQUEL] 闭括号之后是 `<`（实例化表达式 `(a.b)<string>`）或反引号（标签模板 `` {p:1}`t` ``）时，
这条续接归 legacy 的 `ParsePostfix` / `TypeCatalogFactory`，**本机制不建**：括号原样留给收口格。

为什么不是「先建容器再让收口补」：这两种续接在 legacy 里都是「把左操作数当 basic 括号」的形态判据
（模板标签名单 / 类型实参开始格），提前换成形状会让那一格判否，实测 `(a.b)<string>` 在容器之后
`ParseExpression` 直接抛「表达式意外结束」、`{p:1}`t`()` 在收口格抛「未并入的括号」。
方向与 `ArrowAhead` / `CalleeStart` 一致：宁可少建，不可建错。

```ts
const head = ContainerShapeCatalog.NextCodeText(bracket, 1);
if (head === "<" || head === "`") {
  return false;
}
return true;
```

## static method RoleMatchesBracket:(bracket:Bracket, role:string)=>bool

角色与括号字符必须一致（`ObjectLiteral`↔`{`、`ArrayLiteral`↔`[`、`CallArgs`/`ParenExpression`↔`(`）。
[B4i:ROLE-GUARD] 实测 `new ns[a]` 的 `[` 被角色解析器标成 `CallArgs`，`CalleeStart` 于是从 `ns` 起
`ParsePostfix`，建出的 `CallExpressionShape` 把 `new ns` 留在容器之外（收口时静默丢掉）。
角色名与字符不自洽 ⇒ 这一格让给 legacy（`Refused`），不猜。

```ts
if (role === BracketRole.ObjectLiteral) {
  return bracket.StartBracketChar === "{";
}
if (role === BracketRole.ArrayLiteral) {
  return bracket.StartBracketChar === "[";
}
if (role === BracketRole.CallArgs || role === BracketRole.ParenExpression) {
  return bracket.StartBracketChar === "(";
}
return false;
```

## static method InsideArrowTail:(units:Array<Token>, at:int)=>bool

[B4i:ARROW-TAIL] 括号的宿主 `Data` 里、本括号之前是否已经出现过 `=>`（在展开初始化器的 `=` 之后）。
是 ⇒ 本括号在**箭头体 / 箭头表达式内部**，整条 arrow 归 legacy 的原子建树 / B4d 的 replay；
本机制不建（否则 `async (a) => await g(a)` 里 `g(a)` 先被建成容器，收口格看到「容器 + 未并入的括号」）。
反向截止在 `=`：初始化器之前的赋值号说明已经回到声明头，不继续往前找。

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=>")) {
    return true;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return false;
  }
}
return false;
```

## static method InsideNewExpression:(units:Array<Token>, at:int)=>bool

[B4i:NEW-CALLEE] 本括号之前（同一段初始化器内，碰到 `=` / `;` 就停）出现过 `new` ⇒ 这条后缀链的
所有权属于 `NewExpression`（`new ns[a].b()` 的 callee 包含下标 / 成员 / 参数括号整段）。
`CalleeStart` 只回答「从哪里起」，回答不了「该不该由 `CallExpressionShape` 接手」；实测
`new ns[a].b()` 会建出一个从 `new` 之后起算的 `CallExpressionShape`，把 `new ns` 留在容器之外，
收口时静默丢掉（structural=5、`new` 一次都没进树）。方向同 `ArrowAhead`：让给 legacy。

```ts
for (let index = at - 1; index >= 0; index--) {
  const unit = units[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol) {
    const text = (unit as Symbol).TempToString();
    if (text === "=" || text === ";" || text === ",") {
      return false;
    }
  }
  if (unit instanceof Common && (unit as Common).TempToString() === "new") {
    return true;
  }
}
return false;
```

## static method PreviousCodeIndex:(units:Array<Token>, tokenIndex:int)=>int

`tokenIndex` **之前**第一个非 trivia 单元的下标；没有返回 `-1`（与 `Positions` 的口径一致：
只有非 trivia 单元会推进 `pos`）。

```ts
for (let index = tokenIndex - 1; index >= 0; index--) {
  if (!units[index].IsTriviaToken) {
    return index;
  }
}
return -1;
```

## static method SymbolText:(unit:Token)=>string

```ts
if (unit instanceof Symbol) {
  return (unit as Symbol).TempToString();
}
return "";
```

## static method BasePos:(bracket:Bracket, units:Array<Token>, at:int)=>int

构造 builder 时的 `basePos`：**只影响第一格**的 `Pos`（之后每一格都用前一格的 `EndIndex`）。
括号前面还有代码单元 ⇒ 取那个单元的 `EndIndex`；括号是父单元第一格 ⇒ 父括号的
`StartIndex + 1`，或父形状自己的 `Pos`；都拿不到 ⇒ `-1`（调用方放弃建树）。

```ts
const previous = ContainerShapeCatalog.PreviousCodeIndex(units, at);
if (previous >= 0) {
  if (units[previous].SourceRange.EndIndex >= 0) {
    return units[previous].SourceRange.EndIndex;
  }
  if (units[previous].SourceRange.StartIndex >= 0) {
    return units[previous].SourceRange.StartIndex;
  }
  return -1;
}
const parent = bracket.Parent;
if (parent !== null && parent instanceof Bracket) {
  if ((parent as Bracket).SourceRange.StartIndex >= 0) {
    return (parent as Bracket).SourceRange.StartIndex + 1;
  }
  return -1;
}
if (parent !== null && parent instanceof ShapeToken) {
  const pos = (parent as ShapeToken).Pos;
  if (pos >= 0) {
    return pos;
  }
}
if (bracket.SourceRange.StartIndex >= 0) {
  return bracket.SourceRange.StartIndex;
}
return -1;
```

## static method CalleeStart:(units:Array<Token>, bracketIndex:int)=>int

`CallArgs` 的**后缀链起点**：从括号前一个代码单元往左走，穿过 `a.b` / `a?.b` 的成员访问；
返回 `-1` 表示「不让本机制建」：`>` / `?.` / `??`（类型实参调用 / 可选调用）与 `new` 之后的 `(`
（`NewExpressionShape` 不是 `CallExpressionShape`）。

```ts
let start = ContainerShapeCatalog.PreviousCodeIndex(units, bracketIndex);
if (start < 0) {
  return -1;
}
const mark = ContainerShapeCatalog.SymbolText(units[start]);
if (mark === ">" || mark === "?." || mark === "??") {
  return -1;
}
while (true) {
  const before = ContainerShapeCatalog.PreviousCodeIndex(units, start);
  if (before < 0) {
    break;
  }
  const beforeMark = ContainerShapeCatalog.SymbolText(units[before]);
  if (beforeMark !== "." && beforeMark !== "?.") {
    break;
  }
  const nameAt = ContainerShapeCatalog.PreviousCodeIndex(units, before);
  if (nameAt < 0) {
    break;
  }
  start = nameAt;
}
const beforeStart = ContainerShapeCatalog.PreviousCodeIndex(units, start);
if (beforeStart >= 0) {
  const head = units[beforeStart];
  if (head instanceof Common && (head as Common).TempToString() === "new") {
    return -1;
  }
}
return start;
```

## static method IsPostfixBracketPosition:(bracket:Bracket, units:Array<Token>, at:int)=>bool

`[` 的**位置**判据（B4i）：`[...]` 的括号角色只回答内容（`ArrayLiteral`），不回答位置。前面的代码单元
是一个**已结束的操作数**时，这个 `[` 是**下标访问**（`ns[a]` / `f()[a]` / `arr[0]` / `(x)[i]`），
legacy 会在收口格用 `ParsePostfix` 把它并进成员链；本机制若按数组字面量建出容器，`new ns[a]()`
会变成「`new ns` + 数组字面量」（实测 `expr-new-callee-postfix-chain`：`NewExpression` / `ElementAccess`
各少一个、`CallExpression` / `ArrayLiteralExpression` 各多一个）。这里**原样让给 legacy**（`Refused`
方向，不建错），与 `CalleeStart` 对 `?.(` / `<T>(` 的让路同一口径。

判据复用 `Template.RegexTemplate.IsOperandEnd`（与正则起点判据同一份：`Common` 非表达式关键字 /
`String` / `RegexToken` / `Bracket`），再加一条「前一个是本机制建的容器」。

```ts
if (at <= 0) {
  return false;
}
const previous = ContainerShapeCatalog.PreviousCodeIndex(units, at);
if (previous < 0) {
  return false;
}
const before = units[previous];
if (ExpressionAtomRegistry.HasContainer(before)) {
  return true;
}
return bracket.Template.RegexTemplate.IsOperandEnd(before);
```

## static method IsSafeHost:(host:Token)=>bool

**关闭格上允许本机制接手的宿主白名单**（K1 的实测边界）：
只有 `VariableDeclarationShape`（声明初始化器）。其它宿主（`Bracket` / `StatementShape` /
`BinaryExpressionShape` / 成员链形状）**不接手**：它们各有自己的收口方（P1 / P4 / 语句壳 /
父括号的收口），提前换掉括号会把那一拍的所有权抢走。B4i 打开默认开关之后这条白名单**没有放宽**：
`0/29/95` 与开关关闭时逐位相同（`_reports/B4i.md`），四道门也没有新增 fallback。

```ts
if (host instanceof Bracket) {
  return false;
}
return host.constructor.name === "VariableDeclarationShape";
```

# class ContainerShapeCloseHook extends BracketClosedHook

`BracketClosedHook` 的唯一实现：把关闭格上**父单元没有消费**的声明初始化器括号换成容器形状。

## method OnBracketClosed:(bracket:Token, context:SyntaxContext)=>void

顺序固定：

1. **闸**：开关 / 增量模式 / `Bracket` 身份 / 角色（`Known` 四族，或 Deferred `ArrowParams` 且
   `ArrowAhead` 为假）；
2. **位置闸（B4i）**：角色与括号字符自洽 / `(` 后是 `=>` / 闭括号后是 `<` 或反引号 —— 任一不成立
   就**不建**（`RefusedCount + 1`）；
3. **宿主白名单**：只有 `VariableDeclarationShape` 接手；
4. **父单元先手**：括号已经不在父单元 `Data` 里 ⇒ 父单元已经消费了它（`AlreadyConsumedCount + 1`），
   本机制不参与那一格；
5. **在飞位置**：`InsideArrowTail` / `InsideNewExpression` / 后缀 `[` —— 不建（`RefusedCount + 1`）；
6. **建**：`ExpressionBuilder.Load(父单元.Data, basePos)`，`ParsePrimary`（`CallArgs` 是
   `ParsePostfix`），并要求 `At === 括号格 + 1`——必须恰好消费到本括号为止；
7. **换**：把「起点…括号」这一段 `Data` 换成建出来的形状，登记 `Containers`，同步 `MountedUnit`。

任何一步不成立都**原样返回**：括号留给 legacy 收口（`RefusedCount + 1`），不产生半棵树。

```ts
if (!StatementRouteUtil.EnableContainerShape) {
  return;
}
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return;
}
if (bracket === null || !(bracket instanceof Bracket)) {
  return;
}
const shape = bracket as Bracket;
let role = shape.Role;
// [B4e:K1] **Deferred `ArrowParams` 的分组那一半**：初始化器 / 元素位 / 实参位的 `(` 在创建格
// 分不出「分组」与「箭头形参表」，B4b 因此登记 Deferred（`_reports/B4b.md` §5.2：没有 owner 调
// `DeferredBracketCatalog.Bind`，所以它永远停在 Deferred）。关闭格是**最后一次**能分开的时机：
// 闭括号之后不是 `=>` / `:`（`ArrowAhead` 为假）⇒ 它就是分组括号，按 `ParenExpression` 建。
// 是箭头形参表 ⇒ 原样让给 B4d 的 replay（本钩子一个字都不改）。
if (shape.RoleState === BracketRoleState.Deferred && role === BracketRole.ArrowParams) {
  if (ContainerShapeCatalog.ArrowAhead(shape)) {
    return;
  }
  role = BracketRole.ParenExpression;
} else if (shape.RoleState !== BracketRoleState.Known) {
  return;
}
if (!ContainerShapeCatalog.IsExpressionRole(role)) {
  return;
}
// [B4i] 三条**位置**闸（都在「建」之前，全部是 `Refused` 方向：括号原样留给 legacy 收口）：
//   · 角色与括号字符必须自洽（`new ns[a]` 的 `[` 被标成 `CallArgs` 时不能从 `ns` 起建调用）；
//   · `(` 后面紧跟 `=>` / `:` ⇒ 箭头形参表，归 B4d 的 replay；
//   · 闭括号之后是 `<` / `` ` `` ⇒ 实例化表达式 / 标签模板，归 legacy 的后缀判据。
if (!ContainerShapeCatalog.RoleMatchesBracket(shape, role)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
if (shape.StartBracketChar === "(" && ContainerShapeCatalog.ArrowAhead(shape)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
if (!ContainerShapeCatalog.SequelAllowsBuild(shape)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
const parent = shape.Parent;
if (parent === null || parent.Data === undefined) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
if (!ContainerShapeCatalog.IsSafeHost(parent)) {
  return;
}
const units = parent.Data;
const at = units.indexOf(shape);
// 父单元先手：A4 / A4b / P1 / P4 已经在关闭那一拍把括号换成自己的形状。
if (at < 0) {
  ContainerShapeCatalog.AlreadyConsumedCount += 1;
  return;
}
if (!shape.Closed) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
// [B4i:POSTFIX-INDEX] `[` 在前一个操作数之后是下标访问，不是数组字面量：让给 legacy 收口。
if (role === BracketRole.ArrayLiteral && ContainerShapeCatalog.IsPostfixBracketPosition(shape, units, at)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
// [B4i:ARROW-TAIL] 已经在箭头体 / 箭头表达式内部：整条 arrow 归 legacy 的原子建树。
if (ContainerShapeCatalog.InsideArrowTail(units, at)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
// [B4i:NEW-CALLEE] `new` 构造的 callee / 参数链归 `NewExpression`，不建 `CallExpressionShape`。
if (role === BracketRole.CallArgs && ContainerShapeCatalog.InsideNewExpression(units, at)) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
const basePos = ContainerShapeCatalog.BasePos(shape, units, at);
if (basePos < 0) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
const builder = new ExpressionBuilder(shape.Template, context);
builder.Load(units, basePos);
const index = builder.Units.indexOf(shape);
if (index < 0) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
let start = index;
if (role === BracketRole.CallArgs) {
  start = ContainerShapeCatalog.CalleeStart(builder.Units, index);
  if (start < 0) {
    ContainerShapeCatalog.RefusedCount += 1;
    return;
  }
}
builder.At = start;
let built:Token | null = null;
try {
  if (role === BracketRole.CallArgs) {
    built = builder.ParsePostfix();
  } else {
    built = builder.ParsePrimary();
  }
} catch (error) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
if (built === null || builder.At !== index + 1) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
if (built === shape || built.IsBasicToken) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
const slot = units.indexOf(builder.Units[start]);
if (slot < 0 || slot > at) {
  ContainerShapeCatalog.RefusedCount += 1;
  return;
}
ExpressionAtomRegistry.RegisterContainer(built);
built.Parent = parent;
if (parent.MountedUnit === shape) {
  parent.MountedUnit = built;
}
units.splice(slot, at - slot + 1, built);
ContainerShapeCatalog.BuildCount += 1;
StatementRouteUtil.ContainerShapeBuildCount += 1;
```
