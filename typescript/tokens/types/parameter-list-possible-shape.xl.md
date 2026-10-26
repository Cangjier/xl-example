# dependencies
```xl
import { ArrayTypeShape } from "./array-type-shape.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { DotDotDotTokenShape } from "../punctuation/dot-dot-dot-token-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ParameterShape } from "./parameter-shape.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { QuestionTokenShape } from "../punctuation/question-token-shape.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
import { ExpressionBuilder } from "../expressions/expression-builder.xl.md"
import { BracketRole } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleCatalog } from "../statements/bracket-role-resolver.xl.md"
import { BracketRoleResolver } from "../statements/bracket-role-resolver.xl.md"
```

# namespace cangjie

# class ParameterScan

一只函数参数表括号的**逐字建造状态**（B1）。

与 `MemberPossibleScan` 同款：一只括号一份，靠 `Host`（= 括号的 `Data` 数组对象本身）
在静态注册表里定位。**不放进 `PossibleShapeCache`**：`CatalogGuide.Reset` 会
`Clear` 掉 `Values`，而本状态必须跨「建出一个形状」存活；收口侧
（`Finalize` / `CollectBuiltParameters`）也要按括号反查。

## field Host:Array<Token> = []

括号的 `Data` 数组引用，注册表的匹配键（不额外存括号引用，避免注册表把它钉住）。

## field Bracket:Bracket | null = null

这只 `Data` 所属的参数表括号；每次入口都重新写一遍（同一 `Data` 只对应一只括号）。

## field Open:Token | null = null

当前**还没收口**的 `ParameterShape` 壳；`null` = 两个参数之间的空档。

## field Opened:Array<Token> = []

本括号建出来的全部 `ParameterShape`（按出现顺序）。

## field Separator:int = -1

最近一个已经处理过的 `,` 在 `Data` 里的下标；下一个参数组从它之后开始。

## field LastColonEnd:int = -1

最近被「吃掉」的 `:` 的 `EndIndex`（= 类型节点的 `Pos`，含冒号前的 trivia）：
`f(...args: number[])` 的 `number` 是 `Pos = 19`，就是这一步存下来的。

## field PendingArray:ArrayTypeShape | null = null

**[B1b] 还没收口的数组类型壳**：`[` 创建格先包出 `ArrayTypeShape`（目标 26 格），
`]` 闭合格只补终点（`Probe` 动作 8）。非空期间参数表只等这一只括号闭合，不做别的事。

## field Finalized:bool = false

`Finalize` 是否已经收过口（幂等）。

## field FinalizeDone:bool = false

**[B4h]** `Finalize` **真的跑完过**（与 `Finalized` 不同：后者在第一个 `,` 收壳时就置真）。
`Finalize` 用它做幂等闸：同一只括号第二次被问到直接返回，不推进任何候选。

## field AllowQuestion:bool = false

**[B4h] 只有函数类型参数表才置真**：允许名字之后、`:` 之前出现 `?`（`type G = (b?: number) => …`）。
`function` 声明 / 箭头形参表的状态保持 `false`，B1 / B4f 的读数逐字节不变。

`?` 那一格由 `Probe` 的动作 10 建 `QuestionTokenShape`（`ParameterShape.QuestionToken`，与 legacy
`ParseParameter` 同字段、同 child 顺序：Identifier → QuestionToken → Type）。

# class ParameterListPossibleShape

**函数参数表 `(` 的角色目录（B1，A1 矩阵 #1 / D-a 型）。**

与 B0 的关系：`BracketRoleResolver` 对 `FunctionDeclarationShape` 宿主上的 `(` 返回
`Known(ParameterList)`；本类把候选目录注册进 `BracketRoleResolver.Catalogs`，由
`BracketCatalogInstaller.Install` 挂到括号上（终结候选由安装器统一补 `WaitingEndPossible`）。
`ParameterPossibleShape` 是目录里**唯一**的候选：`CatalogGuide` 在同一格只会建一个形状，
多候选会因 `Candidates.size > 1` 永远等不到唯一候选，所以逐字建造必须由**一个**候选自己推进。

**[B1] 只接「简单参数表」**：`IsSimpleList` 用源码文本判一遍
`[ '...' ] name [ ':' type ]`（`type` = 标识符 + 零或多个 `[]`）。
判不进去的括号**一个字节都不动**，整段留给 legacy `BuildParameters`——
解构 / 默认值 / 可选 `?` / 装饰器 / 泛型类型都走这条（任务书允许它们后置）。
这样绝不会出现「半建」：目录要么整份装上，要么完全不装。

**[B4f] 第二份闸 `IsSimpleArrowList`（只给箭头 site）**：`IsSimpleList` 是**文本**判据，
遇到默认值里的 `(` / `{` 就放弃；箭头形参表的默认值恰恰长这样。所以箭头侧另有一份**单元级**判据
（语法面相同：`[ '...' ] name [ ':' type ] [ '=' default ]`），`Probe` 多了动作 9 把
`=` + 默认值整段建成一个子节点。`InstallIfSimple`（`function` 声明）仍然只用 `IsSimpleList`，
**B1 的读数逐字节不变**。

## static field Enabled:bool = true

功能开关（B1）。关掉 ⇒ `InstallIfSimple` 直接返回 `false`，括号逐字节回到本 WP 之前。

## static field MountCount:int = 0

参数表括号挂上目录的次数。

## static field PromotedNameCount:int = 0

把函数名从 raw `Common` 提前建成 `IdentifierShape` 的次数。

## static field SimpleRejectCount:int = 0

`IsSimpleList` 判否、整段交回 legacy 的次数。

## static field LegacyFallbackCount:int = 0

收口时参数表里没有已建 `ParameterShape`、仍走 `BuildParameters` 的次数。

## static field FinalizeCount:int = 0

`Finalize` 真正收口了一只参数壳的次数。

## static field BuildActionCount:int = 0

逐字建造动作（建壳 / `...` / 名字 / 类型 / 数组包裹 / 逗号收口）的总次数。

## static field DefaultValueCount:int = 0

**[B4f]** 真正把「`=` + 默认值表达式」建成一个子节点、并从 `Data` 里逐字吃掉的次数。
只在箭头形参表上可能非 0（`InstallIfSimple` 的文本闸仍然不接受 `=`，见 `IsSimpleArrowList`）。

## static field States:Array<ParameterScan> = []

按括号 `Data` 数组对象登记的扫描状态（见 `ParameterScan.Host`）。

## private static field CatalogRegistered:bool = false

## private static field FunctionTypeCatalogRegistered:bool = false

## static field FunctionTypeMountCount:int = 0

**[B4h]** 函数类型参数表括号挂上目录的次数（证据用；B1 的 `MountCount` 读数不含它）。

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method Shapes:()=>Array<PossibleShape>

目录里**唯一**的候选（进程内只建一份，与 `BodyGuideUtil.CreateShapesCache` 同一纪律）。

```ts
if (ParameterListPossibleShape.CreatePossibleShapesCache === null) {
  ParameterListPossibleShape.CreatePossibleShapesCache = [new ParameterPossibleShape()];
}
return ParameterListPossibleShape.CreatePossibleShapesCache;
```

## static method EnsureRegistered:()=>void

把 `ParameterList` 角色目录注册进 `BracketRoleResolver`，幂等（只注册一次）。

```ts
if (ParameterListPossibleShape.CatalogRegistered) {
  return;
}
ParameterListPossibleShape.CatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.ParameterList, ParameterListPossibleShape.Shapes(), null));
```

## static method EnsureRegisteredForFunctionType:()=>void

**[B4h]** 把 `FunctionTypeParams` 角色目录注册进 `BracketRoleResolver`，幂等。
目录里的候选是**同一份** `ParameterPossibleShape`（`Shapes()`，进程内一份）：函数类型参数表与
`function` 声明 / 箭头形参表共用同一套逐字建造，区别只在状态的 `AllowQuestion`。

调用点在 `TypeAliasDeclarationShape.OnBracketCreatedEvent`（类型别名壳的 `(` 创建格，先于
`BracketRoleHook` 的 `Resolve`），注册后同一格自动变 `Known` 并装上目录。

```ts
if (ParameterListPossibleShape.FunctionTypeCatalogRegistered) {
  return;
}
ParameterListPossibleShape.FunctionTypeCatalogRegistered = true;
BracketRoleResolver.RegisterCatalog(
  new BracketRoleCatalog(BracketRole.FunctionTypeParams, ParameterListPossibleShape.Shapes(), null));
```

## static method InstallForFunctionType:(bracket:Bracket)=>bool

**[B4h]** 给类型位置的函数类型参数表挂状态：**只接 `IsSimpleFunctionTypeParams` 认的形态**。
返回 `true` = 这一次真的挂了（`AllowQuestion` 置真，`?` 才可建）。

判否（默认值 / 解构 / 非简单类型）⇒ **不登记状态、一个字节都不动**：目录虽然装上了，但
`ParameterPossibleShape.IsBuildable` 按 `FindState` 返回 `false`，这一格永远不会建出半步；
创建格也不会建 `FunctionTypeShape` 壳，整段留给 legacy `ParseFunctionType`。

```ts
if (!ParameterListPossibleShape.Enabled) {
  return false;
}
if (!BracketRoleResolver.IsSimpleFunctionTypeParams(bracket)) {
  return false;
}
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
state.AllowQuestion = true;
ParameterListPossibleShape.FunctionTypeMountCount += 1;
return true;
```

## static method FindState:(units:Array<Token>)=>ParameterScan | null

按括号 `Data` 数组对象找状态；没有就返回 `null`。

```ts
for (const state of ParameterListPossibleShape.States) {
  if (state.Host === units) {
    return state;
  }
}
return null;
```

## static method EnsureState:(units:Array<Token>)=>ParameterScan

找状态，没有就登记一份。

```ts
let state = ParameterListPossibleShape.FindState(units);
if (state === null) {
  state = new ParameterScan();
  state.Host = units;
  ParameterListPossibleShape.States.push(state);
}
return state;
```

## static method DropState:(units:Array<Token>)=>void

括号的生命周期结束时清掉登记（注册表不按文件无限增长）。

```ts
for (let at = ParameterListPossibleShape.States.length - 1; at >= 0; at--) {
  if (ParameterListPossibleShape.States[at].Host === units) {
    ParameterListPossibleShape.States.splice(at, 1);
  }
}
```

## static method TextBetween:(bracket:Bracket)=>string

取括号起点到配对 `)` 之间的源码文本（只给 `IsSimpleList` 做判据，不参与建树）。

```ts
const start = bracket.SourceRange.Start;
if (start < 0) {
  return "";
}
const document = bracket.SourceRange.Document;
if (document === null) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let text = "";
let at = start + 1;
while (at < count) {
  const ch = whole.At(at);
  if (ch === ")") {
    break;
  }
  if (ch === "{" || ch === "}" || ch === ";" || ch === "(") {
    return "";
  }
  text += ch;
  at++;
}
return text;
```

## static method IsSimpleParameter:(text:string)=>bool

单个参数的简单形态：`[ '...' ] name [ ':' name ('[]')* ]`。

```ts
const trimmed = text.trim();
if (trimmed === "") {
  return false;
}
return /^(\.\.\.)?\s*[A-Za-z_$][A-Za-z0-9_$]*\s*(:\s*[A-Za-z_$][A-Za-z0-9_$]*(\[\])*\s*)?$/.test(trimmed);
```

## static method IsSimpleList:(bracket:Bracket)=>bool

整张参数表是否全部由简单参数组成（空表也判否：没东西可建，直接交 legacy）。

```ts
const text = ParameterListPossibleShape.TextBetween(bracket);
if (text === "") {
  return false;
}
const parts = text.split(",");
for (const part of parts) {
  if (!ParameterListPossibleShape.IsSimpleParameter(part)) {
    return false;
  }
}
return true;
```

## static method IsSimpleArrowList:(bracket:Bracket)=>bool

**[B4f] 箭头形参表的第二份闸：按 `Data` 的结构位判，允许 `=` + 默认值。**

`IsSimpleList` 的判据是**源码文本**（`TextBetween`），它遇到 `(` / `{` / `}` / `;` 就整段放弃——
默认值里一个对象 / 数组 / 括号字面量就会让它判否（`(a = {x:1}) =>` 的 `{` 就是这一格）。
所以箭头 site 另开这一份**单元级**判据：`bracket.Data` 里嵌套的括号本来是**一个单元**，
默认值内部的 `,` / `:` / `{` 不会跑到这一层来，因此

- 「默认值内部的对象 / 数组 / 括号」结构上不可能被当成形参表的分隔（A2 #5 R2 的要求）；
- 「简单参数表」的语法面仍然是 `[ '...' ] name [ ':' type ] [ '=' default ]`，与 B1 同一套语法，不放大语义。

**为什么另开一份而不是改 `IsSimpleList`**：那个文本闸是 `function` 声明参数表的入口
（`InstallIfSimple`），改它会把 `function f(a = 1) {}` 一起拉进逐字建——那是 B1 的写域，
本棒不动（保持「函数参数表的既有读数逐字节不变」）。这一份只被箭头侧
（`ArrowParamsCatalog.IsArrowable`）调用。

`phase`：0 = 等名字（可先吃 `...`）、1 = 名字已建（等 `:` / `=` / `,`）、2 = 类型位、3 = 默认值位。

```ts
const data = bracket.Data;
let phase = 0;
let parameters = 0;
let defaultUnits = 0;
for (const unit of data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  const isSymbol = unit instanceof Symbol;
  const text = isSymbol ? (unit as Symbol).TempToString() : "";
  if (phase === 0) {
    if (isSymbol && text === "...") {
      continue;
    }
    if (!(unit instanceof Common) || (unit as Common).CanStartNumber()) {
      // 解构 `{a}` / `[a]`、字符串、数字开头的参数名：都不是简单形参 ⇒ 整份交 legacy。
      return false;
    }
    phase = 1;
    parameters += 1;
    continue;
  }
  if (phase === 1) {
    if (isSymbol && text === ":") {
      phase = 2;
      continue;
    }
    if (isSymbol && text === "=") {
      phase = 3;
      defaultUnits = 0;
      continue;
    }
    if (isSymbol && text === ",") {
      phase = 0;
      continue;
    }
    return false;
  }
  if (phase === 2) {
    if (isSymbol && text === "=") {
      phase = 3;
      defaultUnits = 0;
      continue;
    }
    if (isSymbol && text === ",") {
      phase = 0;
      continue;
    }
    // 类型位只认「标识符 + 零或多个 `[]`」——与 `IsSimpleParameter` 的正则同一口径。
    if (unit instanceof Common) {
      continue;
    }
    if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[") {
      continue;
    }
    return false;
  }
  // phase 3：默认值位。嵌套括号是一个单元，里面的 `,` 看不见；顶层的 `,` 才是下一个参数。
  if (isSymbol && text === ",") {
    phase = 0;
    continue;
  }
  if (isSymbol && (text === ";" || text === "=>" || text === ")")) {
    // 默认值里出现箭头 / 分号：交 legacy（`ExpressionBuilder.ParseAssign` 能读，但判据面先不放大）。
    return false;
  }
  defaultUnits += 1;
}
if (parameters === 0 || phase === 0) {
  // 空表 / 尾随 `,`：没东西可整份建。
  return false;
}
if (phase === 3 && defaultUnits === 0) {
  return false;
}
return true;
```

## static method DefaultValueEnd:(data:Array<Token>, at:int)=>int

**[B4f]** 默认值在 `Data` 里的右边界：`at`（`=` 的下标）之后第一个**顶层** `,` 的下标；没有就是
`data.length`。嵌套括号的 `,` 在括号自己的 `Data` 里，这一层看不见——这正是「默认值内部不得误当形参表」
的结构保证。

```ts
for (let index = at + 1; index < data.length; index++) {
  const unit = data[index];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    return index;
  }
}
return data.length;
```

## static method BuildDefaultValue:(data:Array<Token>, at:int, end:int, context:SyntaxContext)=>Token | null

**[B4f]** 用 **legacy 的同一个建造器**（`ExpressionBuilder.ParseAssign`）把 `[at+1, end)` 建成一个表达式节点。

为什么必须是同一个建造器：默认值这一段的树，legacy `ExpressionBuilder.ParseFunctionParameters` 是
`parameter.Add(inner.ParseAssign())` 建出来的；参数壳一旦由 replay 建好，那一段就不再经过 legacy。
两份代码只要有一处不同，`(a: number, b = 1) => …` 的树就会与 base 差一个节点。所以这里**不写第二套**：

- `Load(data.slice(at + 1, end), data[at].SourceRange.EndIndex)`：`Positions` 的口径与 legacy 的
  `Load(bracket.Data, 括号起点+1)` 逐格一致（两者都取「前一个非 trivia 单元的 `EndIndex`」）；
- `builder.At === builder.Units.length`：整段必须吃完，否则返回 `null`（**判据与建造同源**，
  `CanBuildDefaults` 与 `Probe` 因此不会一个说能建、一个建不出来）。

建不出来时**不改任何东西**（本方法只碰自己的 builder），调用方退回 legacy。

```ts
if (end <= at + 1) {
  return null;
}
const unit = data[at];
let base = 0;
if (unit.SourceRange.EndIndex >= 0) {
  base = unit.SourceRange.EndIndex;
}
const builder = new ExpressionBuilder(unit.Template, context);
builder.Load(data.slice(at + 1, end), base);
let value:Token | null = null;
try {
  value = builder.ParseAssign();
} catch (error) {
  return null;
}
if (value === null) {
  return null;
}
if (builder.At !== builder.Units.length) {
  return null;
}
return value;
```

## static method CanBuildDefaults:(bracket:Bracket, context:SyntaxContext)=>bool

**[B4f]** 整份形参表里的**每一个**默认值都能像 legacy 那样建出来。

这是 `ArrowParamsCatalog.BindArrowParen` 在 replay **之前**的干跑闸：判否就一只括号都不 replay
（`RejectCount += 1`，整段照 B4d 的现状交 legacy）。有了它，「默认值建不出来」永远不会变成
「参数名已经建好、`=` 还留在 `Data` 里」的半建括号——那条半建会让 legacy
`ParseFunctionParameters` 报「函数参数只支持标识符或绑定模式」。

```ts
for (let at = 0; at < bracket.Data.length; at++) {
  const unit = bracket.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Symbol) || !(unit as Symbol).Is("=")) {
    continue;
  }
  const end = ParameterListPossibleShape.DefaultValueEnd(bracket.Data, at);
  if (ParameterListPossibleShape.BuildDefaultValue(bracket.Data, at, end, context) === null) {
    return false;
  }
}
return true;
```

## static method PreviousParamPos:(data:Array<Token>, at:int, bracket:Bracket, shell:ParameterShape | null)=>int

新子节点的 `Pos`：**壳里最后一个已建子单元的终点**；壳还没有子单元时退到「`Data` 里前一个非 trivia
单元的终点」；两者都没有就退到括号起点 +1。

**顺序就是「先壳、后 `Data`」，不能反过来**：`...` / `:` 这些**已经被吃进壳里**的单元在下一次
`Probe` 时已不在 `Data` 里，于是 `Data` 里上一个单元是那个**逗号**，它的终点比 `...` 的终点小 3
（实测 `(a, b = 1, ...c)` 的 `c` 会退成 127 而不是 131，`expr-arrow-params-default-rest.ts`
`Identifier[3] 131-132` 一条漂移就这么来的）。壳里的最后一个子单元才是「紧挨着本子节点的那个单元」：

- `args` 的 `Pos = 14` 靠这一条（`...` 的终点），否则会退成 `(` 后面的 11；
- `(a, b = 1, ...c)` 的 `c` 同理（`...` 的终点 131）。

壳里没有子单元时（刚开壳、`Data` 里的上一个单元就是 `,` / `(`）仍按 `Data` 取，所以
`b` 在 `(a, b = 1)` 里仍是逗号的终点 127——与 legacy `Positions[nameIndex]`（前一个非 trivia 单元的
`EndIndex`）同口径。

```ts
let pos = 0;
if (bracket.SourceRange.Start >= 0) {
  pos = bracket.SourceRange.StartIndex + 1;
}
if (shell !== null) {
  const last = shell.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    // 壳里已有子单元：它才是「紧挨着本子节点的那个单元」（`...` / `:` 已被吃进壳，`Data` 里看不到）。
    return last.SourceRange.EndIndex;
  }
}
for (let back = at - 1; back >= 0; back--) {
  const unit = data[back];
  if (unit.IsTriviaToken || unit === shell) {
    continue;
  }
  if (unit.SourceRange.End >= 0) {
    pos = unit.SourceRange.EndIndex;
  }
  break;
}
return pos;
```

## static method NextChar:(last:SourceRange | null)=>string

`SourceRange` 之后第一个非空白请求字符（跨行 / 注释）。与
`MemberPossibleUtil.NextChar` 同一手法：只用来判「这个词是不是已经到底了」。

```ts
if (last === null) {
  return "";
}
const document = last.Document;
if (document === null || last.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
let at = last.EndIndex;
while (at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\v"
    || ch === "\f" || ch === "\u2028" || ch === "\u2029") {
    at++;
    continue;
  }
  return ch;
}
return "";
```

## static method IsTerminator:(ch:string)=>bool

这个词后面是不是**参数边界**：`)` / `,` / `]` / `;` / 文件尾。
`f(a: string)` 的 `string` 一直不 `Closed`（`Bracket.ExitOrPre` 直接吃掉 `)`，
不像 `[` 那样先在 `Transit` 里把前一个单元关掉），所以类型 / 名字的「可建」判据
必须允许这一条；否则最后一个参数永远建不出来，收口只能回退 legacy。

```ts
return ch === "" || ch === ")" || ch === "," || ch === "]" || ch === ";";
```

## static method CloseShell:(state:ParameterScan, shell:ParameterShape, context:SyntaxContext)=>void

收口一只参数壳：终点取最后一个已建子单元的终点（与 legacy `SpanNode` 同口径），再 `TryToClose`。
**直接写 `SourceRange.End`**：`SignOutToken` 会撞 `SourceRangeEndIsSetted`
（`function-declaration-shape.xl.md` 的 `TakeParameterInitializer` 同一个教训）。

```ts
const last = shell.Last();
if (last !== null && last.SourceRange.End >= 0) {
  shell.SourceRange.End = last.SourceRange.End;
}
shell.TryToClose(context);
state.Open = null;
state.Finalized = true;
ParameterListPossibleShape.FinalizeCount += 1;
```

## static method Probe:(state:ParameterScan, units:Array<Token>, context:SyntaxContext | null)=>int

`IsBuildable` 与 `BuildByIndex` 共用的**唯一判据**：返回下一步动作码
（0 = 没有可建的东西）。动作码：1 建参数壳、2 `...`、3 名字、4 吃掉 `:`、5 类型、
6 数组包裹、7 逗号收口、9 `=` + 默认值（[B4f]）。

`context === null` 时只判不建；非 `null` 时按动作真的建一步。

「可建」= 目标单元已经 `Closed` 或源区间已经定死。半开的 `Common`
（`arg` 正在敲）绝不能建，否则名字会被截断。

**[B4f] 动作 9（默认值）的两个前提**：① `shell.ParameterName !== null`（默认值只在名字之后）；
② `BuildDefaultValue` 整段吃完。建不出来就返回 0、**一个字节都不动**——「判据与建造同源」，
所以 `IsBuildable` 不会在 `BuildByIndex` 建不出来的时候说「能建」。

```ts
const data = units;
const bracket = state.Bracket;
if (bracket === null) {
  return 0;
}
let shell:ParameterShape | null = null;
if (state.Open !== null && state.Open instanceof ParameterShape) {
  shell = state.Open as ParameterShape;
}
if (shell === null) {
  let start = state.Separator + 1;
  while (start < data.length && data[start].IsTriviaToken) {
    start++;
  }
  if (start >= data.length) {
    return 0;
  }
  const first = data[start];
  if (first instanceof Symbol && (first as Symbol).Is(",")) {
    if (context === null) {
      return 7;
    }
    state.Separator = start;
    return 7;
  }
  if (context === null) {
    return 1;
  }
  const opened = new ParameterShape(first.Template);
  opened.Pos = ParameterListPossibleShape.PreviousParamPos(data, start, bracket, null);
  if (first.SourceRange.Start >= 0) {
    opened.SignIn(first.SourceRange.Start);
  }
  opened.Parent = bracket;
  data.splice(start, 0, opened);
  state.Open = opened;
  state.Opened.push(opened);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 1;
}
const shellIndex = data.indexOf(shell);
if (shellIndex < 0) {
  return 0;
}
let at = shellIndex + 1;
while (at < data.length && data[at].IsTriviaToken) {
  at++;
}
if (at >= data.length) {
  return 0;
}
const unit = data[at];
// [B1b] 数组类型的第二格：`[` 已经包出 `ArrayTypeShape`（动作 6），这一格只等 `]` 闭合补终点。
// 未闭合期间只认这一只括号，别的词一个都不建（否则会重复包裹 / 把 `]` 前的内容再啃一遍）。
if (state.PendingArray !== null) {
  if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "["
    || !(unit as Bracket).Closed) {
    return 0;
  }
  if (context === null) {
    return 8;
  }
  const pending = state.PendingArray as ArrayTypeShape;
  const closing = unit as Bracket;
  if (pending.SourceRange.End < 0 && closing.SourceRange.End >= 0) {
    pending.SourceRange.End = closing.SourceRange.End;
  }
  pending.TryToClose(context);
  shell.Type = pending;
  state.PendingArray = null;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 8;
}
if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
  if (context === null) {
    return 7;
  }
  ParameterListPossibleShape.CloseShell(state, shell, context);
  state.Separator = at;
  ParameterListPossibleShape.BuildActionCount += 1;
  return 7;
}
if (unit instanceof Symbol && (unit as Symbol).Is(":")) {
  if (context === null) {
    return 4;
  }
  if (unit.SourceRange.End >= 0) {
    state.LastColonEnd = unit.SourceRange.EndIndex;
  }
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 4;
}
// [B4h] 可选形参 `?`（只给函数类型参数表：`type G = (b?: number) => …`）。
// `state.AllowQuestion` 为假时**不进这一支**——B1 的 function 形参表 / B4f 的箭头形参表读数逐字节不变。
// 位置 / 字段与 legacy `ParseParameter` 完全同口径：`QuestionToken.Pos = 名字的终点`（= `PreviousParamPos`），
// 区间只盖 `?` 一个字符，child 顺序是 Identifier → QuestionToken → Type。
if (unit instanceof Symbol && (unit as Symbol).Is("?") && state.AllowQuestion
  && shell.ParameterName !== null && shell.QuestionToken === null) {
  if (context === null) {
    return 10;
  }
  const question = new QuestionTokenShape(unit.Template);
  if (unit.SourceRange.Start >= 0) {
    question.SignIn(unit.SourceRange.StartIndex);
    question.SignOut(unit.SourceRange.StartIndex + 1);
  }
  question.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  question.TryToClose(context);
  shell.QuestionToken = question;
  shell.Add(question);
  question.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 10;
}
// [B4f] 默认值：`=` + 默认值表达式**逐字吃掉**（`(a: number, b = 1) =>` / `(a = {x:1}) =>`）。
// 默认值内部的对象 / 数组 / 括号是**一个已建括号单元**，所以这一层永远看不到它们里面的 `,`，
// 不可能被误当形参表的分隔；顶层 `,` 才是下一个参数（`DefaultValueEnd`）。
if (unit instanceof Symbol && (unit as Symbol).Is("=") && shell.ParameterName !== null) {
  if (context === null) {
    return 9;
  }
  const valueEnd = ParameterListPossibleShape.DefaultValueEnd(data, at);
  const value = ParameterListPossibleShape.BuildDefaultValue(data, at, valueEnd, context);
  if (value === null) {
    return 0;
  }
  shell.Add(value);
  value.Parent = shell;
  data.splice(at, valueEnd - at);
  ParameterListPossibleShape.DefaultValueCount += 1;
  ParameterListPossibleShape.BuildActionCount += 1;
  return 9;
}
if (unit instanceof Symbol && (unit as Symbol).Is("...") && shell.RestToken === null) {
  if (context === null) {
    return 2;
  }  const rest = new DotDotDotTokenShape(unit.Template);
  rest.SignInToken(unit);
  rest.SignOutToken(unit);
  rest.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  rest.TryToClose(context);
  shell.RestToken = rest;
  shell.Add(rest);
  rest.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 2;
}
if (unit instanceof Common && shell.ParameterName === null
  && (unit.Closed || ParameterListPossibleShape.IsTerminator(ParameterListPossibleShape.NextChar(unit.SourceRange)))) {
  if (context === null) {
    return 3;
  }
  const name = IdentifierShape.FromBasicToken(unit as Common, context);
  name.Pos = ParameterListPossibleShape.PreviousParamPos(data, at, bracket, shell);
  shell.ParameterName = name;
  shell.Add(name);
  name.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 3;
}
if (unit instanceof Common && shell.ParameterName !== null && shell.Type === null
  && (unit.Closed || ParameterListPossibleShape.IsTerminator(ParameterListPossibleShape.NextChar(unit.SourceRange)))) {
  if (context === null) {
    return 5;
  }
  const builder = new TypeBuilder(unit.Template, context);
  const basePos = state.LastColonEnd >= 0 ? state.LastColonEnd : 0;
  builder.Load([unit], basePos);
  const built = builder.ParseType();
  if (builder.At !== builder.Units.length) {
    return 0;
  }
  shell.Type = built;
  shell.Add(built);
  built.Parent = shell;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 5;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "[" && shell.Type !== null) {
  const arrayBracket = unit as Bracket;
  const element = shell.Type as ShapeToken;
  // [B1b] `[` **创建格**就包壳：元素已经建好（`number` 在上一格成了 `NumberKeywordShape`），
  // `]` 那一格只补终点（动作 8）。目标：`ArrayTypeShape` / `NumberKeywordShape` 都在 26 格出现。
  if (!arrayBracket.Closed) {
    if (context === null) {
      return 6;
    }
    const openShape = new ArrayTypeShape(unit.Template);
    openShape.ElementType = element;
    openShape.Add(element);
    if (element.SourceRange.Start >= 0) {
      openShape.SignIn(element.SourceRange.StartIndex);
    }
    openShape.Pos = element.Pos;
    shell.Data.splice(shell.Data.indexOf(element), 1, openShape);
    openShape.Parent = shell;
    shell.Type = openShape;
    state.PendingArray = openShape;
    ParameterListPossibleShape.BuildActionCount += 1;
    return 6;
  }
  if (context === null) {
    return 6;
  }
  const arrayShape = new ArrayTypeShape(unit.Template);
  arrayShape.ElementType = element;
  arrayShape.Add(element);
  if (element.SourceRange.Start >= 0) {
    arrayShape.SignIn(element.SourceRange.StartIndex);
  }
  if (arrayBracket.SourceRange.End >= 0) {
    arrayShape.SignOut(arrayBracket.SourceRange.EndIndex);
  }
  arrayShape.Pos = element.Pos;
  arrayShape.TryToClose(context);
  shell.Data.splice(shell.Data.indexOf(element), 1, arrayShape);
  arrayShape.Parent = shell;
  shell.Type = arrayShape;
  data.splice(at, 1);
  ParameterListPossibleShape.BuildActionCount += 1;
  return 6;
}
return 0;
```

## static method Step:(state:ParameterScan, bracket:Bracket, context:SyntaxContext)=>bool

按 `Probe` 的动作码真正建一步；返回 `false` = 没有可建的东西。

```ts
state.Bracket = bracket;
const action = ParameterListPossibleShape.Probe(state, bracket.Data, context);
return action !== 0;
```

## static method StepAtBracketCreated:(parent:Bracket, bracket:Bracket, context:SyntaxContext)=>void

**[B1b] `[` 创建格的重算入口**：core 的「安全重算」只对 `{` 生效，`[` 创建格没有 compute 入口，
于是参数表里 `A[]` 的数组壳要等 `]` 那一格才包出来（27，而不是 26）。B0 的角色钩子（`BracketRoleCatalogHook`）
在**每只括号创建之后**都会被调一次，这里就借那一格把参数表的 `Probe` 推进一步。

只在**本括号的 `Data` 里登记过参数表状态**（`FindState`）时动手——其余括号一个字节都不碰，
`object-literal` / 数组字面量 / 下标的 `[` 仍是原来的解析路径（本方法看不到它们的状态）。

```ts
if (!(bracket as Bracket).Is("[", "]")) {
  return;
}
const state = ParameterListPossibleShape.FindState(parent.Data);
if (state === null) {
  return;
}
state.Bracket = parent;
let guard = 0;
while (guard < 8 && ParameterListPossibleShape.Step(state, parent, context)) {
  guard++;
}
```

## static method NextActionFor:(state:ParameterScan, bracket:Bracket)=>int

`IsBuildable` 的入口：把括号记进状态后**只判不建**。

```ts
state.Bracket = bracket;
return ParameterListPossibleShape.Probe(state, bracket.Data, null);
```

## static method Finalize:(host:Token, context:SyntaxContext)=>void

收口钩子：`(` 括号闭合那一格（`FunctionDeclarationShape.ComputePossibleShapes` 里调），
把还没收口的参数壳补完。**只在括号已经闭合时动手**，否则会把正在敲的参数截断。

```ts
const data = host.Data;
let last = -1;
for (let at = data.length - 1; at >= 0; at--) {
  if (!data[at].IsTriviaToken) {
    last = at;
    break;
  }
}
if (last < 0) {
  return;
}
const unit = data[last];
if (!(unit instanceof Bracket) || (unit as Bracket).StartBracketChar !== "("
  || !(unit as Bracket).Closed) {
  return;
}
const bracket = unit as Bracket;
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null || state.FinalizeDone) {
  // [B4h] 幂等：`Finalize` 可能被同一只括号问到不止一次（括号关格之后它仍可能是宿主的末单元，
  // 注释 / `=>` 到达之前还会再算一格）。已经收过口就不再推进——再进一次 `Probe` 的
  // 「没有开壳」分支会为空壳另建一只 `ParameterShape`。
  // **不看 `Finalized`**：那个标志在第一个 `,` 收壳时就置真了（B1 的既有语义），
  // 拿它当「收口已做完」会让多参数函数声明最后一个参数永远建不出来。
  return;
}
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
if (state.Open !== null && state.Open instanceof ParameterShape) {
  ParameterListPossibleShape.CloseShell(state, state.Open as ParameterShape, context);
}
state.FinalizeDone = true;
```

## static method CollectBuiltParameters:(bracket:Bracket)=>Array<Token> | null

收口侧：括号里**已经建好的** `ParameterShape` 列表；有任何残留 raw 代码单元就返回 `null`
（= 半建状态，调用方必须回退 legacy，见类注释）。

```ts
const state = ParameterListPossibleShape.FindState(bracket.Data);
if (state === null || !state.Finalized) {
  return null;
}
const parameters:Array<Token> = [];
const residue:Array<Token> = [];
for (const unit of bracket.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof ParameterShape) {
    parameters.push(unit);
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is(",")) {
    continue;
  }
  residue.push(unit);
}
if (parameters.length === 0 || residue.length !== 0) {
  return null;
}
ParameterListPossibleShape.DropState(bracket.Data);
return parameters;
```

## static method InstallIfSimple:(host:Token, bracket:Bracket, context:SyntaxContext)=>bool

给函数声明的参数表括号挂 `ParameterList` 目录：**只做简单参数表**。
返回 `true` = 这一次真的挂上了（调用方据此计数）。

```ts
if (!ParameterListPossibleShape.Enabled) {
  return false;
}
if (!ParameterListPossibleShape.IsSimpleList(bracket)) {
  ParameterListPossibleShape.SimpleRejectCount += 1;
  return false;
}
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
ParameterListPossibleShape.MountCount += 1;
return true;
```

# class ParameterPossibleShape extends PossibleShape

参数表目录里的**唯一候选**（B1）：每次被问到就按 `ParameterScan` 的判据建**一步**，
建完 `CatalogGuide` 自动复位，下一个词再问一次——这就是「逐字」的来源。

它自己**不判角色**（角色在 `BracketRoleResolver`），也**不装目录**（安装器装）：
只负责「这一步该建什么就建什么」。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

永远 `Uncertain`：本候选**从不主动退出**目录（参数表里每一格都可能还有下一步），
建不建只看 `IsBuildable`。`Reject` 会让 `Candidates` 变空，参数表就再也建不出东西。

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

有可建的一步才 `true`。判据与 `Step` 同源（`Probe` 的只判模式），不另写一份。

```ts
const state = ParameterListPossibleShape.FindState(units);
if (state === null) {
  return false;
}
const bracket = state.Bracket;
if (bracket === null) {
  return false;
}
return ParameterListPossibleShape.NextActionFor(state, bracket) !== 0;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

把这一步该建的都建掉（一次判定里可以连做几步：建壳 + `...`、类型 + 数组包裹），
直到 `Probe` 说没有下一步。

```ts
if (!(host instanceof Bracket)) {
  return host;
}
const bracket = host as Bracket;
const state = ParameterListPossibleShape.EnsureState(bracket.Data);
state.Bracket = bracket;
let guard = 0;
while (guard < 64 && ParameterListPossibleShape.Step(state, bracket, context)) {
  guard++;
}
return host;
```
