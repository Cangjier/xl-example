# dependencies
```xl
import { BranchStates } from "../branch-states.xl.md"
import { CloseStates } from "../close-states.xl.md"
import { ComputePossibleShapesStates } from "../compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../i-compute-possible-shapes.xl.md"
import { PossibleSource } from "../possible-source.xl.md"
import { SourceRange } from "../source-range.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { Template } from "../templates/template.xl.md"
import { UnitToken } from "../unit-token.xl.md"
import { Common } from "./common.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 AST 行。

括号单元：`( )` / `{ }` / `[ ]` 三对括号共用这一个类，靠 `StartBracketChar` / `EndBracketChar` 两个字段区分。它只认「配对的结束括号」这一个字符——括号里的内容全靠挂载的子单元自己啃。

# class BracketChildCreatedHook

括号宿主上的「子括号创建」监听接口（Stage 4k）。`Bracket.OnBracketCreatedEvent` 在把新括号挂到自己 `Data`
之后转调它一次。core 只留接口，实现放在 typescript 侧（类体里方法 / 构造器体括号补挂块体语句目录），
这样 core 不反向依赖 typescript。

## method OnChildBracketCreated:(parent:Token, bracket:Token, context:SyntaxContext)=>void

```ts
throw new Error("abstract: OnChildBracketCreated");
```

# class BracketRoleHook

**括号角色装配钩子（B0）：core 侧只留接口，实现放在 typescript 侧。**

`Bracket.Transit` 在「新括号挂好、宿主 `OnBracketCreatedEvent`（族收尾）跑完之后」调用 `Current` 一次。
职责是 B0 的通用机制：`BracketRoleResolver.Resolve` → `BracketCatalogInstaller.Install`（`Known`）/
`DeferredBracketCatalog.Register`（`Deferred`）/ 计数（`Fallback`）。

`Current` 默认 `null`：**默认状态下 `Transit` 只是多做一次 `null` 比较**——不建任何形状、不改任何 `Data`、
不装任何目录，既有解析产物逐字节不变。typescript 侧在
`StatementRouteUtil.EnableBracketRoleCatalog` 为真时由 `SourceFileShape` 的构造器懒装上
（`BracketRoleCatalogHook.EnsureInstalled`），与 `Bracket.ChildBracketCreatedHook` 的装配手法一致。

**为什么不在 core 里直接解析角色**：判据要问语句族（`StatementRouteUtil.Decide`）、要按类名认识声明族
宿主，全在 `typescript`；core 反向依赖 typescript 会成环。这里只留一个「宿主 + 括号 + 上下文」的抽象入口，
与 `BracketChildCreatedHook` 同一条纪律。

## static field Current:BracketRoleHook | null = null

进程内唯一的括号角色钩子。`null` = 没装（默认）= B0 之前的行为。

## method OnBracketCreated:(host:Token, bracket:Token, context:SyntaxContext)=>void

`host` 是新括号的宿主（形状 / 语句壳 / 根单元 / 另一只括号），`bracket` 是刚建出来的括号。

抽象方法，core 不给实现。

```ts
throw new Error("abstract: OnBracketCreated");
```

# class BracketCloseHook

**括号关闭前的通知（B0，B4b）。** `Bracket.Close` 在「标记 `Closed`」之后、`FlushOnClose` 补判与
「问父单元」之前调用 `Current` 一次。

为什么需要它（A2 §1 / B4 §4 的容器形状卡点）：`CatalogGuide.FlushOnClose` 只能补判**最后一格**，
没有「宿主即将关闭」的信号；而「括号里已经攒出的内容该收成容器形状」这件事，只能发生在**关闭那一拍**，
并且要能改**父单元的 `Data`**。本钩子只提供这个时机，**不新增任何建树路径**：实现方拿到的是括号与
上下文，自不自在、要不要改父单元，全由它在自己的开关下决定。

`Current` 默认 `null`：默认状态下 `Close` 只是多做一次 `null` 比较，既有产物逐字节不变。

## static field Current:BracketCloseHook | null = null

进程内唯一的括号关闭监听。`null` = 没装（默认）。

## method OnBracketClosing:(bracket:Token, context:SyntaxContext)=>void

`bracket` 是正在关闭的括号（`Closed` 已置真、`Data` 已经完整、**尚未**问父单元）。

抽象方法，core 不给实现。

```ts
throw new Error("abstract: OnBracketClosing");
```

# class BracketClosedHook

**括号关闭后的通知（B4e/K1）。** `Bracket.Close` 在「问完父单元」之后调用 `Current` 一次。

为什么不是 B4b 的 `BracketCloseHook`：那个时机在「问父单元」**之前**，实现方一旦在那里把括号
换成容器形状，父单元的候选（A4 对象 / A4b 数组·括号 / P1 调用 / P4 分组）就整族被跳过——
它们不只是建树的竞争者，还是「右操作数封口 / 卸载在飞单元」的**收口方**。实测把括号提前换掉
会让 `BinaryExpressionShape` 的右操作数永不封口，下一个字符（`;`）落进二元形状的 `Data`，
`CatalogGuide` 抛「没有候选形状可以构成（宿主 BinaryExpressionShape）」。所以容器形状的落槽
必须排在父单元之后：先让既有收口方按自己的所有权消费括号，**只有它们都不要这只括号**时，
本钩子才把括号换成容器形状（`_reports/B4e.md` §4）。

`Current` 默认 `null`：默认状态下 `Close` 只是多做一次 `null` 比较，既有产物逐字节不变。

## static field Current:BracketClosedHook | null = null

进程内唯一的括号关闭后监听。`null` = 没装（默认）。

## method OnBracketClosed:(bracket:Token, context:SyntaxContext)=>void

`bracket` 是刚关闭的括号：`Closed` 已置真、`Data` 已经完整、父单元已经被问过。
**父单元可能已经把它消费掉**（`bracket.Parent.Data.indexOf(bracket) < 0`）——实现方必须先判这一条。

抽象方法，core 不给实现。

```ts
throw new Error("abstract: OnBracketClosed");
```

# class BracketCreatePossibleHook

**括号创建触发的 possible 重算钩子（T2）：core 侧只留接口，实现放在 typescript 侧。**

`Bracket.Transit` 在「新括号挂好、宿主 `OnBracketCreatedEvent`（族收尾）跑完、`BracketRoleHook`（角色目录）也跑完」之后调用 `Current` 一次。职责是把「括号刚建出来」这件事作为一个**新的触发来源**（`PossibleSource.BracketCreate`）交给可能感知它的宿主：

1. 新括号自己（若 `CatalogGuide !== null`）——此刻它的 `Data` 还是空的，通常直接 `Nothing`；已有目录时不提前装、不替它装；
2. 父宿主（若实现了 `IComputePossibleShapes` 且挂了带终结候选的向导）——这就是既有 `OnBracketCreatedEvent` 里那条窄触发（`{` + `EndPossible !== null`）的通用位置，但来源显式传 `BracketCreate`。

`Current` 默认 `null`：默认状态下 `Transit` 只是多做一次 `null` 比较——不建任何形状、不改任何 `Data`，
既有解析产物逐字节不变。typescript 侧在 `StatementRouteUtil.EnableBracketCreatePossible` 为真时由
`SourceFileShape` 的构造器懒装上（`BracketCreatePossibleTrigger.EnsureInstalled`）。

**为什么放在 `BracketRoleHook` 之后**：`Bracket.OnBracketCreatedEvent` 触发时新括号自己的 `CatalogGuide` 还是
`null`（角色目录要等 `BracketRoleHook` → `BracketCatalogInstaller.Install` 才挂上），只有排到它后面才能问
「新括号自己」。放在这里也顺带把既有的一条窄触发接管过来：钩子装了（开关开）时 `OnBracketCreatedEvent`
里那条旧触发**不执行**（见该方法），避免同一格被问两次。

## static field Current:BracketCreatePossibleHook | null = null

进程内唯一的括号创建重算钩子。`null` = 没装（默认）= T2 之前的行为。

## method OnBracketCreatedPossible:(host:Token, bracket:Token, context:SyntaxContext)=>void

`host` 是新括号的宿主，`bracket` 是刚建出来的括号（此刻 `Data` 为空、目录可能已由角色机制装上）。

抽象方法，core 不给实现。

```ts
throw new Error("abstract: OnBracketCreatedPossible");
```

# class Bracket extends UnitToken

括号。

单元值类型是单字符的 `string`。

它同时**也是一个宿主**（与 `Shape` 同款）：`UnitToken` 已经给了 `CatalogGuide`（默认 `null`）和 `IComputePossibleShapes`，所以括号里的 basic token 关闭时问到的就是括号自己的目录向导。默认 `null` 表示括号里不判候选；谁需要判，就在括号建出来之后给它挂上——接口体就是这么做的：`InterfaceDeclarationShape` 在自己的括号创建事件里认出接口体，再把接口体目录向导装到这个括号上。

括号自己的关闭仍然只问父单元，不因为自己挂了向导就改成问自己。

输出也不覆写：括号自己只是 `Data` 的宿主，子单元由基类 `Token.ToAstLine` 串成树；`StartBracketChar` / `EndBracketChar` 是解析用的字段，不印进行文本。

## field IsBasicToken:bool = true

basic 单元：由 `Template.BasicBranchQueue()` 收出来。

## constructor:(template:Template)=>void

以模板创建，并把本类型的跳转队列取出来；取运行时类型用 `this.constructor`。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## field StartBracketChar:string = "("

起始括号字符。

## field EndBracketChar:string = ")"

结束括号字符。

## field RoleState:int = 0

**纯标量**（B0）：这只括号的角色解析结果，取值与 typescript 侧 `BracketRoleState` 一一对应
（`0` = 还没解析 / `1` = `Known` / `2` = `Deferred` / `3` = `Fallback`）。

core 刻意不 import `BracketRoleState`（否则 core 反向依赖 typescript），所以这里存 `int` 而不是那个类的字段。
它**不参与任何建树、不进 `Data`、不进 XML**：只是给安装器 / 延迟目录 / 探针读的状态位。

## field Role:string = ""

**纯标量**（B0）：角色名（`BracketRole` 的字符串常量，例如 `"ParameterList"` / `"StatementBlock"`）。
空串 = 还没解析。安装器用它做「同一括号第二个不同角色」的冲突判据。

## field ReplayCount:int = 0

**纯标量**（B0）：这只括号被 `DeferredBracketCatalog.Replay` 成功 replay 过几次。
`0` 之外的任何值都表示「已经一次性消费过」（R1）：再 `Bind` 只返回 `AlreadyInstalled`，不重放。

## method Is:(start:string, end:string)=>bool

判断本括号是不是 `start` / `end` 这一对——只比每对的第一个字符，所以 `Is("(", ")")` 与 `Is("()", ")")` 等价。

```ts
return this.StartBracketChar === start[0] && this.EndBracketChar === end[0];
```

## method Use:(value:string)=>Bracket

按起始字符把本单元配置成对应的括号对，返回自身便于链式调用。未知字符抛 `Exception("未知括号")`。

```ts
if (value === "(") {
  this.StartBracketChar = "(";
  this.EndBracketChar = ")";
} else if (value === "{") {
  this.StartBracketChar = "{";
  this.EndBracketChar = "}";
} else if (value === "[") {
  this.StartBracketChar = "[";
  this.EndBracketChar = "]";
} else {
  throw new Error("未知括号");
}
return this;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，然后**只问父单元**要不要重算候选——父单元没实现 `IComputePossibleShapes` 就不问，也不再往上找。

父单元是不是宿主由它自己的 `CatalogGuide` 说了算：为空就等于没挂向导，被问到也不做任何事。

重算的返回值原样带上去：建出了形状时，正在收尾的这个 token 要让当前字符重放。

问完父单元之后还有一次**关闭后的通知**（`BracketClosedHook`，B4e/K1）：父单元的候选先按自己的
所有权消费括号（对象 / 数组 / 调用 / 分组的既有收口方都在这一拍建树），只有它们都不要这只括号时，
实现方才把括号换成容器形状。`Current` 默认 `null` ⇒ 只多一次 `null` 比较。

```ts
this.Closed = true;
// [B4b:CLOSE] 关闭前的通知（B0）：容器形状的「创建格」只能落在这一拍——`Data` 已经完整、
// 父单元还没被问过。默认 `null` ⇒ 这一行只多一次 `null` 比较，既有产物逐字节不变。
if (BracketCloseHook.Current !== null) {
  BracketCloseHook.Current.OnBracketClosing(this, context);
}
// [B3:FLUSH] 宿主关闭前补判自己的最后一格：`switch (a)` / `if (a)` 的 `a` 是被**本括号的闭括号**
// 终结的，它上一次「basic token 关闭时问父单元」那一格没有机会发生，于是向导一次都没被问到，
// `a` 到收口格仍然是 `Common`。
// 只有 `CatalogGuide.FlushOnClose` 为真的向导会走这条（默认 false ⇒ 既有向导逐字节不变）。
// 补判与逐格判定走同一个入口（`ComputePossibleShapesByIndex` + `Data.length - 1`），
// 因此「候选还在等 ⇒ `Waiting`，什么都不建」的语义完全一致。
if (this.CatalogGuide !== null && this.CatalogGuide.FlushOnClose && this.Data.length > 0) {
  this.ComputePossibleShapesByIndex(this.Data.length - 1, context, PossibleSource.Close);
}
// [B4e:K1] 关闭后的通知（**父单元问完之后**）：容器形状只能在这里落槽——父单元的候选
// （A4 对象 / A4b 数组·括号 / P1 调用 / P4 分组）会先按自己的所有权消费括号；只有它们都不要
// 这只括号时，实现方才把括号换成容器形状。放在「问父单元」之前改 `Data` 会把这些候选整族跳过，
// 实测会让 `BinaryExpressionShape` 的右操作数永不封口（`_reports/B4e.md` §4）。
// `Current` 默认 `null` ⇒ 只多一次 `null` 比较，既有产物逐字节不变。
const parent = this.Parent;
let closedState = CloseStates.Nothing;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context, PossibleSource.Close);
  if (state === ComputePossibleShapesStates.Built) {
    closedState = CloseStates.Built;
  }
}
if (BracketClosedHook.Current !== null) {
  BracketClosedHook.Current.OnBracketClosed(this, context);
}
return closedState;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

兜底处理。空实现——括号既不吞字符也不跑跳转，字符全交给挂载的子单元。

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

遇到配对的结束括号就退出：先签出到该字符之后，再尝试关闭，然后从父单元卸载自己，返回 `Done`；否则返回 `Undo`，让这一个字符继续往下走。

`value` 是驱动层已经读好的当前字符（`buffer.ValueAt(index)`）：直接比较，不再复读。

`\u{…}` 花括号转义进行中时，`}` 是转义的收口、不是本括号的结束括号：这时返回 `Undo`，让 `Common` 吃掉它。

```ts
if (value === this.EndBracketChar) {
  if (Common.IsInUnicodeBraceEscape(this)) {
    return BranchStates.Undo;
  }
  this.SignOut(index + 1);
  this.TryToClose(context);
  this.Quit();
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## static field ChildBracketCreatedHook:BracketChildCreatedHook | null = null

进程内唯一的子括号创建监听（typescript 侧在第一次根层括号事件时装上；legacy 对拍档不装、也不做任何事）。

## method OnBracketCreatedEvent:(bracket:Token, context:SyntaxContext)=>void

括号自己作为宿主时的括号创建事件（Stage 4k）。`Bracket.Transit` 建出新括号、挂进本括号 `Data` 之后调用。

两件事，顺序固定：

1. **转调监听**：给类体里的方法 / 构造器体补挂块体语句目录（只挂目录，不改任何 AST 决定）；
2. **安全重算**：本括号的目录**有终结候选**（`EndPossible !== null`）时就地对新括号判一格。函数体 / 块体的
   块体目录都是这种（终结候选 `BlockBodyWaitingPossibleShape`），候选全灭时返回 `Waiting` 而不是抛错，所以
   这一格是安全的；类体 / 接口体 / 枚举体的成员目录没有终结候选，**一律不重算**——S4i 方案 A 的抛错出口
   （`size === 0 && EndPossible === null`）正是后者。

早判一格是**嵌套块深度 ≥2** 的修法：内层 `{` 刚建出来时外层块体目录就把它收成块壳（并给它的括号挂上块体
目录），而不是等它闭合后才收——那时它内部的语句早已按 raw 吃完。

**[B0] 本方法从此只做「族收尾」，不承担角色判定。** 通用机制的职责已经转到
`BracketRoleHook`（`Transit` 在本方法**之后**调用它）：角色由 `BracketRoleResolver` 按宿主形状 + 括号字符 +
已确定语句族判定，目录由 `BracketCatalogInstaller` 幂等安装。所以这里的三条纪律是：

1. **不新增任何目录安装**：族特有的事（转调监听、安全重算）保持原样，**一行都不改**；
2. **`ChildBracketCreatedHook` 只保留「非括号宿主适配」**：`Transit` 末尾那一次补通知是箭头体 / 根层
   括号的唯一入口；这里的这次转调保持既有行为（块体里的嵌套 `{` 靠它），等各族的角色目录迁完之后
   再逐个删分支；
3. **不让安装器第二次装**：`BracketCatalogInstaller.Install` 看到 `CatalogGuide !== null` 就返回
   `AlreadyInstalled`，所以「族已装」的括号不会被重复挂目录（也不会被清空 `PossibleShapes`）。

```ts
if (Bracket.ChildBracketCreatedHook !== null) {
  Bracket.ChildBracketCreatedHook.OnChildBracketCreated(this, bracket, context);
}
// [T2:CREATE] 开关打开时（`BracketCreatePossibleHook.Current !== null`）旧窄触发**不执行**：
// 同一格由 `Transit` 末尾的新触发用 `PossibleSource.BracketCreate` 重新问一次，避免双触发。
// 开关关闭时（默认，`Current === null`）这里逐字节仍是 T2 之前的行为：只对 `{`、只对带终结候选的向导补判。
if (BracketCreatePossibleHook.Current === null
  && this.CatalogGuide !== null && this.CatalogGuide.EndPossible !== null
  && bracket instanceof Bracket && (bracket as Bracket).StartBracketChar === "{") {
  this.ComputePossibleShapesByIndex(this.Data.length - 1, context, PossibleSource.Close);
}
```

## static method Transit:(context:SyntaxContext, unit:Token, buffer:SourceRange, index:int, value:string)=>BranchStates

只认 `(` / `{` / `[` 三种开括号字符：认下就新建一个 `Bracket`、配成对应的括号对、挂到 `unit` 上并签入。

挂之前先看关闭的结果：关闭上一个 token 的过程可能建出了形状，这时返回 `Reload`，字符交给新形状重吃。

挂好并签入之后，**通知父单元 `OnBracketCreatedEvent`**：父单元可能借这个时机给新括号挂上目录向导（接口体的成员候选就是这么接上的）。父单元没实现 `IComputePossibleShapes` 就不通知，也不再往上找。

`\u{…}` 花括号转义进行中时不起新括号：这时 `{` 属于转义（`\u{61}`），返回 `Undo` 让 `Common` 吃掉。

```ts
if (value !== "(" && value !== "{" && value !== "[") {
  return BranchStates.Undo;
}
if (value === "{" && Common.IsInUnicodeBraceEscape(unit)) {
  return BranchStates.Undo;
}
const lastOfMounted = unit.Last();
if (lastOfMounted !== null && !lastOfMounted.Closed && lastOfMounted.TryToClose(context) === CloseStates.Built) {
  return BranchStates.Reload;
}
const mounted = new Bracket(unit.Template);
unit.Add(mounted);
unit.MountedUnit = mounted;
mounted.Use(value).SignIn(index);
if ("OnBracketCreatedEvent" in unit) {
  (unit as unknown as IComputePossibleShapes).OnBracketCreatedEvent(mounted, context);
}
// 宿主**不是括号**时（根 / 语句壳 / 其它形状单元），`Bracket.OnBracketCreatedEvent` 不会被调用，
// 子括号监听因此要在这里补一次：箭头块体的 `{`（`x => { … }`）就落在语句壳上，根层
// `const f = () => { … }` 的 `{` 甚至不在任何括号里。监听只挂目录、不改任何 AST 决定。
if (!(unit instanceof Bracket) && Bracket.ChildBracketCreatedHook !== null) {
  Bracket.ChildBracketCreatedHook.OnChildBracketCreated(unit, mounted, context);
}
// [B0:ROLE] 通用括号角色机制的唯一调用点。**必须在 `OnBracketCreatedEvent`（族收尾）之后**：
// 族 hook 先按既有路径装它自己的目录（函数体 / namespace / 块体 / switch 子句块 / 箭头体的
// `MountBodyCatalog`），本钩子后到，看到 `CatalogGuide !== null` 就只做「族已装」收尾
// （`BracketCatalogInstaller` 返回 `AlreadyInstalled`，一个字节都不改）。
// 钩子是进程内唯一静态引用，默认 `null` ⇒ 默认状态下这里只多一次 `null` 比较。
if (BracketRoleHook.Current !== null) {
  BracketRoleHook.Current.OnBracketCreated(unit, mounted, context);
}
// [T2:CREATE] BracketCreate 触发点：**必须**在 `BracketRoleHook` 之后——新括号自己的
// `CatalogGuide` 要等角色目录装完才非空，`:306` 那个旧位置只能问到父层。
// 钩子 `Current` 默认 `null`（开关 `StatementRouteUtil.EnableBracketCreatePossible` 默认 false），
// 于是默认路径只多一次 `null` 比较，既有产物逐字节不变。
if (BracketCreatePossibleHook.Current !== null) {
  BracketCreatePossibleHook.Current.OnBracketCreatedPossible(unit, mounted, context);
}
return BranchStates.Done;
```
