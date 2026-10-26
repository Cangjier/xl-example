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
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { TypeBuilder } from "./type-builder.xl.md"
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

## field Finalized:bool = false

`Finalize` 是否已经收过口（幂等）。

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

## static field States:Array<ParameterScan> = []

按括号 `Data` 数组对象登记的扫描状态（见 `ParameterScan.Host`）。

## private static field CatalogRegistered:bool = false

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

## static method PreviousParamPos:(data:Array<Token>, at:int, bracket:Bracket, shell:ParameterShape | null)=>int

新子节点的 `Pos`：**前一个非 trivia 单元的终点**；没有就退到括号起点 +1。
参数壳还没签出时，退回壳里最后一个已建子单元的终点——`args` 的 `Pos = 14` 就靠这一条
（`...` 的终点），否则会退成 `(` 后面的 11。

```ts
let pos = 0;
if (bracket.SourceRange.Start >= 0) {
  pos = bracket.SourceRange.StartIndex + 1;
}
if (shell !== null) {
  const last = shell.Last();
  if (last !== null && last.SourceRange.End >= 0) {
    pos = last.SourceRange.EndIndex;
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
6 数组包裹、7 逗号收口。

`context === null` 时只判不建；非 `null` 时按动作真的建一步。

「可建」= 目标单元已经 `Closed` 或源区间已经定死。半开的 `Common`
（`arg` 正在敲）绝不能建，否则名字会被截断。

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
  if (!arrayBracket.Closed) {
    return 0;
  }
  if (context === null) {
    return 6;
  }
  const element = shell.Type as ShapeToken;
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
if (state === null) {
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
