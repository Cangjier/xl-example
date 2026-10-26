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

**闸**：`StatementRouteUtil.EnableContainerShape`（默认 `false`，实测见 `_reports/B4e.md` §4）且
增量模式；`OnBracketClosed` 里再检查一次（同一进程里两种模式可以交替）。legacy 档
`Current` 即使被上一次增量解析装上，本钩子也立即返回、一个字节不改。

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
const range = bracket.SourceRange;
if (range.Document === null || range.End < 0) {
  return false;
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
if (at >= count) {
  return false;
}
const head = range.Document.GetValue(at);
if (head === ":") {
  return true;
}
if (head === "=" && at + 1 < count && range.Document.GetValue(at + 1) === ">") {
  return true;
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

## static method IsSafeHost:(host:Token)=>bool

**关闭格上允许本机制接手的宿主白名单**（K1 的实测边界，`_reports/B4e.md` §4）：
只有 `VariableDeclarationShape`（声明初始化器）。其它宿主（`Bracket` / `StatementShape` /
`BinaryExpressionShape` / 成员链形状）**不接手**：它们各有自己的收口方（P1 / P4 / 语句壳 /
父括号的收口），提前换掉括号会把那一拍的所有权抢走。白名单是实测出来的边界，不是「默认关
掩盖」：开关默认 `false` 的读数与理由见 `_reports/B4e.md` §4。

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
2. **宿主白名单**：只有 `VariableDeclarationShape` 接手；
3. **父单元先手**：括号已经不在父单元 `Data` 里 ⇒ 父单元已经消费了它（`AlreadyConsumedCount + 1`），
   本机制不参与那一格；
4. **建**：`ExpressionBuilder.Load(父单元.Data, basePos)`，`ParsePrimary`（`CallArgs` 是
   `ParsePostfix`），并要求 `At === 括号格 + 1`——必须恰好消费到本括号为止；
5. **换**：把「起点…括号」这一段 `Data` 换成建出来的形状，登记 `Containers`，同步 `MountedUnit`。

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
