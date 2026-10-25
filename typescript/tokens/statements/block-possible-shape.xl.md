# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket, BracketChildCreatedHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "../declarations/body-guide-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "./control-flow-statement-possible-shape.xl.md"
import { CaseClauseStatementPossibleShape } from "./case-clause-statement-possible-shape.xl.md"
import { DeclarationStatementPossibleShape } from "./declaration-statement-possible-shape.xl.md"
import { RootExpressionStatementPossibleShape } from "./root-expression-statement-possible-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
```

# namespace cangjie

# class BlockBodyWaitingPossibleShape extends PossibleShape

块体目录的**占位终结候选**：永远 `Uncertain`、永远不建。

它只负责一件事：块内第一个代码单元不属于任何已接管族时（`;` / `if` / 嵌套 `{` …），目录不会因为
「候选全被拒 + 没有终结候选」抛 `没有候选形状可以构成`（那会把整条文件逼进 fallback）。
那些语句保持 raw，留给 `BuildBlock` 的 legacy 递归或 `CollectBodyStatements` 的 raw 段建——
这是块内未覆盖构造的安全回退，而不是失败。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
return ShapeStates.Uncertain;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

```ts
return false;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return host;
```

# class BlockBodyChildBracketHook extends BracketChildCreatedHook

括号宿主上的子括号监听实现：把工作交给 `BlockPossibleShape.OnChildBracketCreated`（判据 / 开关 / 类体门控
都在那里）。core 只认这个接口，不认 typescript 的类。

## method OnChildBracketCreated:(parent:Token, bracket:Token, context:SyntaxContext)=>void

```ts
BlockPossibleShape.OnChildBracketCreated(parent, bracket, context);
```

# class BlockPossibleShape extends PossibleShape

```txt
{ }
{ let x = 1; f(); }
{ { a; } }
```

**块语句的根起点候选**（设计 §1.4 / Stage 4 S4a）。它只认 `StatementRoute.ShellBlock` 起点
（语句首 `{`），在首代码单元到齐时就建 `StatementShape` 壳（`Kind = StatementRoute.ShellBlock`、
`BodyKind = StatementShape.BodyKindBlock`）、把已经攒下的 `{` 括号单元搬进壳、`host.MountedUnit = 壳`；
语句怎么结束、怎么建树全部下放给壳自己的终结候选（`StatementEndPossibleShape`）。

**为什么块可以壳化、而二义不在 Bracket 里裁**：语句首的 `{` 只可能是块语句——对象字面量只出现在
表达式位置（`({ a: 1 });` 的语句首是 `(`，走 `ShellPlainExpression`；`x = { a: 1 }` 的 `{` 是
`=` 之后的括号，由 `ExpressionBuilder` 吃）。所以「块 vs 对象字面量」在
`StatementRouteUtil.Decide` 这一处已经裁决完，本候选只读那个被判出来的 `ShellBlock`，
**不在 Bracket 里新起第二份判据**。

**AST 零差异的来源**：壳收口时 `StatementShape.BuildFromShell` 把**同一个 `{ ... }` 括号单元**
（原子单元，内部仍是 raw basic token）交给**同一个** `StatementBuilder`，走 `BuildBlock()`；
`Pos` 仍取「前一个非 trivia 单元 `EndIndex`」。三条与 legacy
（`StatementPossibleShape` → `BuildStatement` → `BuildBlock`）逐字相同，所以 XML 逐字节、
AST 逐节点一致。块内语句仍由 `BuildBlock` 原子递归（块内目录见 `EnableBlockBodyCatalog`）。

**互斥（不靠先后）**：`Decide` 判成 `ShellBlock` 后，`StatementPossibleShape` 在
`ComputeByIndex` 顶部对「非 `Legacy`」主 `Reject`；`ExpressionStatementPossibleShape` 的
`CanStart` 对 `{` 返回 `false` 本来就不接。两边永远不会同格 Accept。
## static field EnableBlockDeclarationCatalog:bool = true

**块内声明族候选的注册门控**（Stage 4w）：`true` = 在块体目录末尾追加
`DeclarationStatementPossibleShape`（声明 / 导入导出族的专用起点候选）。

默认 `true` 但**当前是惰性的**：该候选自己只认 `StatementRoute.ShellDeclarationFamily`，而
`StatementRouteUtil.Decide` 在 `EnableDeclarationShell = false`（现行默认，Stage 4t 回退）时
对声明头返回 `Legacy`，所以候选在块体目录里一格也不接——块内 `class` / `enum` / `declare`
仍整段留 raw，由 `BuildBlock()` 的 legacy 递归建树（XML / AST 不变，计数不增）。
`EnableDeclarationShell` 打开后，块内声明才走与本候选在根层完全相同的壳 / 收口 / 建树通道，
**不需要第二份判据**。`false` = 连注册都不做，块体目录逐位回到 Stage 4s。

**不修改 `declaration-statement-possible-shape` 文件本身**：本门控只决定「注册不注册」，
候选的判定 / 晚建守卫 / 建壳全部复用那一份。

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

块体语句候选目录的缓存（所有块 `{` 共用一份：候选实例无状态，判定状态在
`CatalogGuide.PossibleShapesComputeCache` 里，共用安全）。与
`BodyGuideUtil.CreateShapesCache` 同一手法。

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

块体目录 = 「已经验证过的语句起点候选」：变量声明壳（`let/const/var`）、普通表达式壳、
控制流族壳，以及**块壳自己**（`BlockPossibleShape`）。它们都靠**自己的** `CatalogGuide` +
`StatementEndPossibleShape` 收口，与宿主是不是 `SourceFileShape` 无关，所以挂到块体括号上可直接复用
（与 `BodyGuideUtil.MountBodyGuide` 给 interface body 挂成员目录同一模式）。

**块壳也在目录里（Stage 4e）**：`{ { a; } }` 的内层 `{` 与根层块语句是同一个起点判据
（`Decide == ShellBlock`），只是宿主换成了外层块体 `{` 括号。候选实例无状态（判定状态在
`CatalogGuide.PossibleShapesComputeCache`），把 `BlockPossibleShape` 放进自己的目录不会递归建目录
（目录只建一份，工厂里不调用 `CreateBodyPossibleShapes()`）。内层块收口时由括号闭合驱动
`StatementShape.TryToClose` 的括号分支，外层块在 `CollectBodyStatements` 里按序收到内层块形状。
```ts
BlockPossibleShape.CreateBodyPossibleShapesCache = BodyGuideUtil.CreateShapesCache(
  BlockPossibleShape.CreateBodyPossibleShapesCache,
  () => {
    const shapes:Array<PossibleShape> = [new VariableStatementPossibleShape(), new RootExpressionStatementPossibleShape(), new ControlFlowStatementPossibleShape(), new BlockPossibleShape(), new AwaitStatementPossibleShape(), new YieldStatementPossibleShape()];
    if (BlockPossibleShape.EnableBlockDeclarationCatalog) {
      shapes.push(new DeclarationStatementPossibleShape());
    }
    return shapes;
  });
return BlockPossibleShape.CreateBodyPossibleShapesCache;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

只在**首代码单元那一格** Accept：建壳之后本条语句已经归壳，后续字符由壳的
`MountedUnit` 路由（不再问根目录）。`Reject` 一旦发生就是永久删除，所以「首代码单元还没到」
（只有 trivia）必须返回 `Uncertain`；这条防御与 `VariableStatementPossibleShape` 的 5 行修复同源。
```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions) {
  return ShapeStates.Reject;
}
// 括号宿主监听必须**早于**任何一个箭头体 / 对象方法体括号：根层 `const f = () => { … }` 的 `(`
// 父单元是变量壳而不是根，`SourceFileShape.OnBracketCreatedEvent` 的懒安装会错过它。
if (StatementRouteUtil.EnableBlockBodyCatalog) {
  BlockPossibleShape.EnsureChildBracketHook();
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
if (StatementRouteUtil.Decide(units, tokenIndex) !== StatementRoute.ShellBlock) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳（此时 `{` 括号单元已经建出来、还可能没闭合）：块语句的收口在
`}` 闭合那一刻由终结候选决定，建壳不需要等括号闭合。
```ts
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken) {
  return false;
}
return StatementRouteUtil.Decide(units, tokenIndex) === StatementRoute.ShellBlock;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

与 `VariableStatementPossibleShape.BuildByIndex` / `RootExpressionStatementPossibleShape.BuildByIndex`
**逐字同构**：搬 raw 单元、`Pos` 取「前一个非 trivia 单元 `EndIndex`」、原位插回壳、
`Parent` / `MountedUnit` 显式设置、终结候选是 `StatementEndPossibleShape`。
两处不同：① `Kind = StatementRoute.ShellBlock` 且 `BodyKind = BodyKindBlock`（供块内目录与
后续 Stage 4b 读）；② 终结候选的 `StatementKind` 保持 `0`，即**沿用 legacy 的
`StatementScanner.ScanRoot` 判界**（`{ }` 的结束由扫描器说，与 legacy 同一份判据），
不走表达式族的 `ExpressionEndCode`。

**块体目录挂载**：`StatementRouteUtil.EnableBlockBodyCatalog` 为 `true` 时，把
`CreateBodyPossibleShapes()` 挂到 `{` 括号的 `CatalogGuide` 上（`BodyGuideUtil.MountBodyGuide`）。
默认 `false`：`StatementBuilder.BuildBlock()` 目前只吃 raw basic token，块内一旦被增量建成
`StatementShape` 形状，`BuildBlock` 就没有「收集已建语句」的通道（见 HANDOFF-s4-block.md
「未覆盖/剩余」）。开关默认关 = 未覆盖构造安全回退，不伪造接管。
```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("块语句候选没有可搬的单元");
}
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const previousEnd = host.Data[at].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
shell.Kind = StatementRoute.ShellBlock;
shell.BodyKind = StatementShape.BodyKindBlock;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = 0;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
let bodyBracket:Bracket | null = null;
for (const item of moved) {
  if (item instanceof Bracket && (item as Bracket).StartBracketChar === "{") {
    bodyBracket = item as Bracket;
  }
}
// 块体括号是在壳之前建出来的（`Bracket.Transit` 先把它 Add 到宿主并 `host.MountedUnit = 括号`），
// 壳接管之后必须把括号挂回**自己**名下：否则后续字符按宿主的 MountedUnit 落到壳上、块内语句进不了括号，
// `}` 也关不到括号，壳就一直挂着去吞下一条语句（S4b 修「同文件第二块不建壳」的根）。
// 搬进来的单元可能以 `{` 之前的 trivia（同文件第二块的换行空白块）开头，所以按类型扫出括号，
// 不能要求 `moved` 恰好只有一个单元——否则括号拿不到 `MountedUnit`，块内字符全落到壳上。`
if (bodyBracket !== null) {
  shell.MountedUnit = bodyBracket;
}
if (StatementRouteUtil.EnableBlockBodyCatalog && bodyBracket !== null) {
  BodyGuideUtil.MountBodyGuide(bodyBracket, BlockPossibleShape.CreateBodyPossibleShapes());
  bodyBracket.CatalogGuide = new CatalogGuide(
    BlockPossibleShape.CreateBodyPossibleShapes(),
    new BlockBodyWaitingPossibleShape());
}
StatementRouteUtil.BlockShellCount += 1;
return shell;
```

## static field FunctionBodyMountCount:int = 0

进程内累计「函数体 / 方法体 / 构造器体括号挂上语句目录」的次数（只增不减，供测试断言接管确实发生）。

## static field ArrowBodyMountCount:int = 0

进程内累计「箭头块体 / 对象字面量方法体括号挂上语句目录」的次数（Stage 4o，只增不减）。
与 `FunctionBodyMountCount` 分开计量，任何既有的「函数体挂载」断言不受影响。

## static field SwitchCaseBodyMountCount:int = 0

**switch case 体**（Stage 4p）：`switch (x) { case 1: { … } }` 的 case 体 `{` 挂上块体语句目录的次数（只增不减）。
与 `ControlFlowBodyBraceCount` 分开计量：switch 的体括号是 `CaseBlockShape` 的入口（`case` / `default` 子句），
**不能**挂语句目录（目录里的表达式候选会把 `case 1:` 当表达式语句建壳）；能挂的是 **case 子句里那个 `{`**。

## static field BlockFunctionBodyMountCount:int = 0

**块内函数声明体**（Stage 4p）：`{ function f(){ … } }` 的函数体 `{` 挂上块体语句目录的次数（只增不减）。
声明本身不新建壳（仍留在 raw 段由 legacy 递归建树），接管只发生在体内语句上——与根层函数体同一条收集通道
（`StatementBuilder.BuildBlock()` → `HasBuiltBodyStatements` / `CollectBodyStatements`）。

## static field EnableSwitchCaseBody:bool = true

**Stage 4s 起默认开**：`case` 子句里的体 `{` 挂块体语句目录，体内语句由 `BuildCaseBlock` → 内层
`BuildStatement()` → `BuildBlock()` → `HasBuiltBodyStatements` / `CollectBodyStatements` 收集。
Stage 4p 打开后必抛 `SourceRange is not set` 的根因是**挂错了括号**：把目录挂到了宿主（switch 的
case 块括号），整段 `case …` 被块体目录当语句建壳；改为挂 case 体 `{` 自己后，case 表达式仍由
`BuildExpressionRange` 建，`case 1:` / `case a + 1:` / `case foo():` 全部不受影响（见 HANDOFF-s4s.md §1）。
`false` = 不挂，行为回到 Stage 4o（case 体整段 raw，未接管但树仍正确）。

## static field EnableBlockFunctionBody:bool = true

**Stage 4s 起默认开**：`{ function f(){ … } }` 的函数体 `{` 挂块体语句目录。声明本身仍留在 raw 段
（块体目录不补声明族候选），由 legacy `BuildFunctionDeclaration` → `BuildBlock()` 建；`BuildBlock` 看到
`HasBuiltBodyStatements(bodyBracket)` 为真后走 `CollectBodyStatements` 收集体内语句。Stage 4p 的
`mount +1 / body +0` 根因同样是**挂错括号**（挂到了外层块括号，把外层块体目录覆盖掉，函数体括号仍是
纯 raw）；改为挂函数体 `{` 自己后 `BlockBodyStatementCount` 正常 +1（见 HANDOFF-s4s.md §2）。

## static method MountBodyCatalog:(bracket:Bracket)=>void

把块体语句目录挂到 `bracket` 上（终结候选 `BlockBodyWaitingPossibleShape`：一个候选都不接也不抛错）。
```ts
bracket.CatalogGuide = new CatalogGuide(
  BlockPossibleShape.CreateBodyPossibleShapes(),
  new BlockBodyWaitingPossibleShape());
```

## static method IsSwitchCaseBody:(body:Bracket, bracket:Token, previous:Token | null)=>bool

**case 体的判据**（Stage 4p），三段，全部只读已有的树与 `Data`：

1. 这个 `{` 前面那个非 trivia 单元是 `:`（`case 1: {` / `default: {`）；
2. 宿主括号的父单元是**控制流壳**（`StatementShape` 且 `Kind === StatementRoute.ShellStatementFamily`）；
3. 壳的首代码单元是 `switch`（即宿主括号是 switch 的 **case 块**，不是 `if (a) { … }` 这种体）。

第 2/3 段把「对象字面量的 `{ a: { b } }`」「类型字面量的 `{ a: { } }`」这类同样以 `:` 开头的括号全部排除：
它们的宿主括号 / 父单元不可能是 `switch` 壳。

```ts
if (previous === null || !(previous instanceof Symbol) || !(previous as Symbol).Is(":")) {
  return false;
}
const owner = body.Parent;
if (!(owner instanceof StatementShape)) {
  return false;
}
if ((owner as StatementShape).Kind !== StatementRoute.ShellStatementFamily) {
  return false;
}
for (const unit of (owner as StatementShape).Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  return unit instanceof Common && (unit as Common).TempToString() === "switch";
}
return false;
```

## static method IsClosedParameterList:(unit:Token)=>bool

`unit` 是不是一个**已闭合的参数表** `( … )`（`(` `)` 在本语法里是同一个 `Bracket` 单元）。
```ts
if (!(unit instanceof Bracket)) {
  return false;
}
return (unit as Bracket).StartBracketChar === "(" && (unit as Bracket).Closed;
```

## static method IsAllCloseAngle:(text:string)=>bool

`text` 是不是**一个或多个连续的 `>`**（本语法会把 `>>` / `>>>` 合并成一个单元）。只用于反向跳过
泛型类型参数列表：`>` 的单元可能带多个字符，必须按个数计深度。
```ts
if (text.length === 0) {
  return false;
}
for (let ci = 0; ci < text.length; ci++) {
  if (text[ci] !== ">") {
    return false;
  }
}
return true;
```

## static method IsFunctionDeclarationBody:(host:Token, bracket:Token)=>bool

**块内 / 体内函数声明体的判据**（Stage 4p）：从体 `{` 往回扫——先过返回类型（`:` 之后到参数表 `(`）、
参数表那个已闭合的 `(`、可选的类型参数 `<…>`、可选的 `*`、函数名，再往前一格必须是 `function`。
扫到 `;` / `=` / `=>` / `,` 立即停（跨语句 / 落进箭头体 / 落进对象字面量时一律不挂）。

**为什么必须确认 `function`**：`m(){ … }`（对象方法）、`constructor(){ … }`（构造器）、`if (a) { … }`（控制流体）
的 `{` 前面同样是「已闭合的 `(`」，只看那一格会把对象字面量 / 类体当成函数体挂目录（形状泄漏）。

```ts
const data:Array<Token> = host.Data;
let braceAt = -1;
for (let at = data.length - 1; at >= 0; at--) {
  if (data[at] === bracket) {
    braceAt = at;
    break;
  }
}
if (braceAt <= 0) {
  return false;
}
let at = braceAt - 1;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
if (at < 0) {
  return false;
}
// **Stage 4w 收窄**：`{` 必须处在**体位置**——前一个非 trivia 单元得能收住一个类型 / 参数表。
// 这条排除「返回类型里的对象字面量」：`function f(): { a: T } { … }` 里类型 `{` 前面是 `:`，
// `CanEndTypeUnit` 为假；真正的函数体 `{` 前面是 `)` 或已经收住的类型（对象字面量类型括号 / 标识符
// / `]` / 字面量），为真。没有这条，类型括号也会被挂上块体目录，`a: T` 被当语句建壳，返回类型解析
// 读到已建形状就抛错，整条文件走文件级 fallback（S4w 专用 case `k<T>(): { a: T }` 暴露）。
if (!BlockPossibleShape.CanEndTypeUnit(data[at])) {
  return false;
}
if (!BlockPossibleShape.IsClosedParameterList(data[at])) {
  while (at >= 0) {
    const unit = data[at];
    if (unit.IsTriviaToken) {
      at--;
      continue;
    }
    if (BlockPossibleShape.IsClosedParameterList(unit)) {
      break;
    }
    if (unit instanceof Symbol) {
      const text = (unit as Symbol).TempToString();
      if (text === ";" || text === "=" || text === "=>" || text === ",") {
        return false;
      }
    }
    at--;
  }
  if (at < 0) {
    return false;
  }
}
at--;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
if (at >= 0 && data[at] instanceof Bracket && (data[at] as Bracket).StartBracketChar === "<") {
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
} else if (at >= 0 && data[at] instanceof Symbol && BlockPossibleShape.IsAllCloseAngle((data[at] as Symbol).TempToString())) {
  // **Stage 4w：泛型函数声明的类型参数在宿主 `Data` 里是平铺的 Symbol 单元**（`<` / `T` / `>`），
  // 不是 Bracket——`FunctionDeclarationShape.FromUnits` 自己就按
  // `code[paramIndex] instanceof Symbol && Is("<")` 判泛型头。原先只跳 Bracket 形态，泛型体 `{`
  // 因此一路退到「名字不是 Common」返回 false：目录没挂上（mount 0），体内语句全部留 raw，
  // `BlockBodyStatementCount` 不增——这就是 S4u 记录的 `mount +1 / body +0` 缺口。
  // 反向扫到配对的 `<`：`>` 计 +1、`<` 计 -1（支持 `>>` / `>>>` 合并单元与 `A<B>` 嵌套），
  // 归零后 `at` 停在那个 `<` 上。判据仍然严格要求再往前是函数名 + `function`，不放松。
  let depth = 0;
  const closeText = (data[at] as Symbol).TempToString();
  for (let ci = 0; ci < closeText.length; ci++) {
    depth++;
  }
  at--;
  while (at >= 0) {
    const inner = data[at];
    if (inner.IsTriviaToken) {
      at--;
      continue;
    }
    if (inner instanceof Bracket && (inner as Bracket).StartBracketChar === "<") {
      depth--;
    } else if (inner instanceof Symbol) {
      const innerText = (inner as Symbol).TempToString();
      for (let ci = 0; ci < innerText.length; ci++) {
        if (innerText[ci] === "<") {
          depth--;
        } else if (innerText[ci] === ">") {
          depth++;
        }
      }
    }
    if (depth <= 0) {
      break;
    }
    at--;
  }
  if (depth !== 0) {
    return false;
  }
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
}
if (at < 0 || !(data[at] instanceof Common)) {
  return false;
}
at--;
while (at >= 0 && data[at].IsTriviaToken) {
  at--;
}
if (at >= 0 && data[at] instanceof Symbol && (data[at] as Symbol).Is("*")) {
  at--;
  while (at >= 0 && data[at].IsTriviaToken) {
    at--;
  }
}
if (at < 0 || !(data[at] instanceof Common)) {
  return false;
}
return (data[at] as Common).TempToString() === "function";
```
## static method IsArrowUnit:(unit:Token)=>bool

`unit` 是不是箭头 `=>`（只看 `Symbol` 文本，不建状态）。
```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=>");
```

## static method PreviousCodeUnit:(unit:Token, bracket:Token)=>Token | null

宿主 `Data` 里紧挨在 `bracket` 之前的**非 trivia 单元**（跳过 `bracket` 自己）。
箭头块体的 `=>`、函数体 / 方法体的 `)` 与返回类型都靠它认；判据只读宿主 `Data`，
不触发任何 `ComputePossibleShapes*`（S4i 方案 A 的抛错出口因此不会被打开）。
```ts
for (let at = unit.Data.length - 1; at >= 0; at--) {
  const item = unit.Data[at];
  if (item === bracket || item.IsTriviaToken) {
    continue;
  }
  return item;
}
return null;
```

## static method EnsureChildBracketHook:()=>void

装一次括号宿主监听（进程级静态字段，懒安装）。**安装点必须早于任何一个箭头体 / 对象方法体括号**：
根层 `const f = () => { … }` 的 `(` 父单元是变量壳而不是根，`SourceFileShape.OnBracketCreatedEvent` 的
懒安装因此可能错过它，所以候选判定入口也补一次（只判 null，命中即返回）。
```ts
if (Bracket.ChildBracketCreatedHook === null) {
  Bracket.ChildBracketCreatedHook = new BlockBodyChildBracketHook();
}
```

## private static method CanEndTypeUnit:(unit:Token)=>bool

一个单元能不能**收住一个类型**：`{` 前面那个单元如果还等着操作数（`:` / `|` / `&` / `<` / `,` / `=` / `=>` / `?`
/ `-` / `+` 以及 `extends` / `keyof` / `typeof` / `infer` / `new` / `readonly` / `unique` / `is` / `asserts` /
`in` / `of` / `as` / `satisfies`），后面那个 `{` 就是类型的一部分而不是体。口径与 `TypeBuilder.IsBodyBrace`
逐字相同（这里不引 `TypeBuilder`，避免块候选反向依赖类型构建器）。

```ts
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ":" || text === "|" || text === "&" || text === "<" || text === ","
    || text === "=" || text === "=>" || text === "?" || text === "-" || text === "+") {
    return false;
  }
  return true;
}
if (unit instanceof Common) {
  const text = (unit as Common).TempToString();
  if (text === "extends" || text === "keyof" || text === "readonly" || text === "unique"
    || text === "typeof" || text === "infer" || text === "new" || text === "abstract"
    || text === "asserts" || text === "is" || text === "in" || text === "of"
    || text === "as" || text === "satisfies") {
    return false;
  }
  return true;
}
return true;
```

## static method IsReturnTypeBrace:(units:Array<Token>, braceIndex:int)=>bool

带返回类型的函数 / 方法体：`{` 前面是一个已经收住的类型，再往前扫到返回类型的 `:`，且 `:` 前面是本条声明的
参数表 `(`（已闭合）。`function g(): number {`、`function h(): { a: number } {`、`function f(a: T): U {`
都命中。

只扫**平铺单元**：类型里的对象字面量 / 函数类型 / 元组都是**单个括号单元**，里面的 `:` 不可见，所以扫到的
第一个可见 `:` 就是返回类型的那个 `:`；扫到 `;` / `=` / `=>` 立即停（跨语句或落进箭头体时一律不挂）。
`case 1: {` / `label: {` 的 `{` 前面直接是 `:`，`CanEndTypeUnit` 先把它排掉。

```ts
let previous = braceIndex - 1;
while (previous >= 0 && units[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
if (!BlockPossibleShape.CanEndTypeUnit(units[previous])) {
  return false;
}
for (let scan = previous; scan >= 0; scan--) {
  const item = units[scan];
  if (item.IsTriviaToken) {
    continue;
  }
  if (item instanceof Common) {
    // 往回扫时遇到**语句 / 声明起点**就停：`declare function f(): void ⏎ export enum E {` 里
    // 枚举体的 `{` 不是 `f` 的体，不能跨过 `enum` / `export` 去认前一条声明的返回类型冒号。
    const text = (item as Common).TempToString();
    if (text === "export" || text === "import" || text === "enum" || text === "class"
      || text === "interface" || text === "type" || text === "namespace" || text === "module"
      || text === "declare" || text === "const" || text === "let" || text === "var"
      || text === "function" || text === "if" || text === "while" || text === "for"
      || text === "return" || text === "switch" || text === "case" || text === "default"
      || text === "throw" || text === "try" || text === "catch" || text === "finally"
      || text === "do" || text === "with" || text === "break" || text === "continue"
      || text === "debugger" || text === "else" || text === "await" || text === "yield"
      || text === "async" || text === "using") {
      return false;
    }
  }
  if (item instanceof Symbol) {
    const symbol = item as Symbol;
    if (symbol.Is(":")) {
      let before = scan - 1;
      while (before >= 0 && units[before].IsTriviaToken) {
        before--;
      }
      if (before < 0) {
        return false;
      }
      const beforeUnit = units[before];
      if (!(beforeUnit instanceof Bracket)) {
        return false;
      }
      const parameters = beforeUnit as Bracket;
      return parameters.StartBracketChar === "(" && parameters.Closed;
    }
    if (symbol.Is(";") || symbol.Is("=") || symbol.Is("=>")) {
      return false;
    }
  }
}
return false;
```

## static method IsSwitchKeywordShell:(shell:Token)=>bool

`shell` 是不是一个以 `switch` 起头的控制流壳（即刚创建的 `{` 是 switch 的 **case 块括号**）。
判据只读壳自己的 `Data`：`Kind === ShellStatementFamily` 且首代码单元是 `switch`。

```ts
if (!(shell instanceof StatementShape)) {
  return false;
}
if ((shell as StatementShape).Kind !== StatementRoute.ShellStatementFamily) {
  return false;
}
for (const unit of shell.Data) {
  if (unit.IsTriviaToken) {
    continue;
  }
  return unit instanceof Common && (unit as Common).TempToString() === "switch";
}
return false;
```

## static method OnShellBracketCreated:(shell:Token, bracket:Token, context:SyntaxContext)=>void

**控制流壳里的体括号创建事件**（Stage 4n，由 `StatementShape.OnBracketCreatedEvent` 转调）。块体壳把自己
的 `MountedUnit` 指到体括号（`{` 成了它的子单元），所以走到这里的只可能是**控制流壳**
（`if` / `while` / `do` / `for` / `with` / `try`）。判据与挂载全在 `TryMountControlFlowBody`；本方法只做
「开关 + 是 `{` + 还没挂过目录」三道前置检查，且**不重算任何宿主的 `ComputePossibleShapes*`**。

**安全回退**：判据不成立（`switch`、对象方法体、箭头块体、块内函数声明……）时一个字也不改，
`BuildStatement` 的 legacy 递归照旧建树——那是「未接管」，不是「建错」。

**声明体分支（gap-SW §4）**：`TryMountControlFlowBody` 只认 `if` / `while` / `do` / `for` / `with` / `try`
六族，所以**声明体**（`class` 体 / `function` 体）走不到它——块内 `class` 的体由内部括号事件接管
（`OnChildBracketCreated` 的 `IsFunctionDeclarationBody` 分支，宿主是块体括号）；而**子句级**
`function f() { … }` 的宿主是**语句壳**（子句壳），那条分支看不到它，函数体于是永远不挂目录
（`BlockFunctionBodyMountCount` 不增、体内语句一条都不接管）。这里给同一条事件补上**同一份判据**：

- 判据是 `IsFunctionDeclarationBody`（与括号宿主那条分支逐字相同），宿主换成壳——它本来就只读
  `host.Data`，对壳同样成立；
- 挂的是函数体 `{` 自己（`MountBodyCatalog(bracket)`），与块内函数声明体同一条收集通道
  （`StatementBuilder.BuildBlock()` → `HasBuiltBodyStatements` / `CollectBodyStatements`），不新增建树路径；
- `EnableBlockFunctionBody` 是同一个门控，关掉时行为逐位回到 gap-SW 之前。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableBlockBodyCatalog) {
  return;
}
if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "{") {
  return;
}
if (!(shell instanceof StatementShape)) {
  return;
}
const body = bracket as Bracket;
if (body.CatalogGuide !== null) {
  return;
}
if (BlockPossibleShape.IsSwitchKeywordShell(shell)) {
  // **switch 的 case 块括号**（Stage 4y）：挂**只含子句语句候选**的目录。绝不能挂块体目录：
  // 目录里的表达式 / 变量候选会把整段 `case <表达式>:` 当一条语句建壳（Stage 4p 的
  // `SourceRange is not set` 就是这么抛的）。
  // **Stage 4ae：单一开关**。本类原先另有一个同名 `EnableSwitchCaseClause`，与
  // `StatementRouteUtil.EnableSwitchCaseClause` 必须同开同关——只开一处就是假空转（挂载侧不开则
  // mount=0，壳计数永远是 0）。同名门控已删除，挂载只问 `StatementRouteUtil` 那一份。
  if (StatementRouteUtil.EnableSwitchCaseClause) {
    body.CatalogGuide = new CatalogGuide(
      [new CaseClauseStatementPossibleShape()],
      new BlockBodyWaitingPossibleShape());
    StatementRouteUtil.SwitchCaseClauseMountCount += 1;
  }
  return;
}
if (BlockPossibleShape.TryMountControlFlowBody(shell, body, context)) {
  return;
}
if (BlockPossibleShape.IsFunctionDeclarationBody(shell, bracket)) {
  // **子句级 / 壳内函数声明体**（gap-SW §4）：`case 1: function f() { g(); }` 的函数体 `{` 的宿主是
  // 子句壳（不是括号），上面那条 `OnChildBracketCreated` 的声明体分支看不到它。挂上之后体内语句
  // 走 `BuildBlock()` 的收集通道，与块内函数声明体逐位相同；声明本身仍由壳收口时的
  // `BuildStatement` 建，不新增任何建树路径。
  if (BlockPossibleShape.EnableBlockFunctionBody && body.CatalogGuide === null) {
    BlockPossibleShape.MountBodyCatalog(body);
    BlockPossibleShape.BlockFunctionBodyMountCount += 1;
  }
}
```

## static method TryMountControlFlowBody:(shell:Token, bracket:Bracket, context:SyntaxContext)=>bool

给**控制流体的 `{`** 挂块体语句目录（Stage 4n）。判据两段：

1. 壳是控制流构造：`Kind === StatementRoute.ShellStatementFamily`，且**首代码单元**的文本是
   `if` / `while` / `do` / `for` / `with` / `try`（`else` / `catch` / `finally` 只能出现在上一条语句内部，
   不可能起一个壳，所以不在集合里）；
2. 这个 `{` 处在**体位置**：前一个非 trivia 单元是 `do` / `else` / `try` / `finally` / `catch`，
   或前一个单元是**已闭合的 `(` 括号**且再往前一格的文本是 `if` / `while` / `for` / `with` / `catch`。

本语法里 `(` `)` 是同一个 `Bracket` 单元，`if (a) {` 与 `catch (e) {` 的「前一个单元」是同一个东西，
所以**必须再往前看一格**才能区分；靠这一格把 `catch (e) {` 收进来、把 `switch (x) {` 排除在外
（`switch` 的体括号同样满足第 2 段，但 `SwitchStatementShape → CaseBlockShape` 的建树路径本轮没读通，
挂上有形状泄漏风险 —— 故意不挂，见 HANDOFF-s4n §5）。

**为什么挂目录是安全的**：挂上去只影响「谁来建体里的语句」，树的形状仍由同一批 builder 产出——已建形状按序
`shape.Add`，raw 段由内层 `BuildStatement()` 逐条建（`HasBuiltBodyStatements` / `CollectBodyStatements`，
与块体同一条通道）。`BlockBodyWaitingPossibleShape` 是终结候选，一个候选都不接时**不抛错**（S4i 的抛错出口
只在 `EndPossible === null` 时存在），所以「挂上但一条也没接」= 未接管，不是错树。

```ts
if (!(shell instanceof StatementShape)) {
  return false;
}
if ((shell as StatementShape).Kind !== StatementRoute.ShellStatementFamily) {
  return false;
}
const data:Array<Token> = shell.Data;
let head = -1;
for (let at = 0; at < data.length; at++) {
  if (data[at].IsTriviaToken) {
    continue;
  }
  head = at;
  break;
}
if (head < 0 || !(data[head] instanceof Common)) {
  return false;
}
const headText = (data[head] as Common).TempToString();
if (headText !== "if" && headText !== "while" && headText !== "do"
  && headText !== "for" && headText !== "with" && headText !== "try") {
  return false;
}
let braceAt = -1;
for (let at = data.length - 1; at >= 0; at--) {
  if (data[at] === bracket) {
    braceAt = at;
    break;
  }
}
if (braceAt <= 0) {
  return false;
}
let previous = braceAt - 1;
while (previous >= 0 && data[previous].IsTriviaToken) {
  previous--;
}
if (previous < 0) {
  return false;
}
let mount = false;
const before = data[previous];
if (before instanceof Common) {
  const text = (before as Common).TempToString();
  if (text === "do" || text === "else" || text === "try" || text === "finally" || text === "catch") {
    mount = true;
  }
}
if (!mount && before instanceof Bracket
  && (before as Bracket).StartBracketChar === "(" && (before as Bracket).Closed) {
  let keyword = previous - 1;
  while (keyword >= 0 && data[keyword].IsTriviaToken) {
    keyword--;
  }
  if (keyword >= 0 && data[keyword] instanceof Common) {
    const text = (data[keyword] as Common).TempToString();
    if (text === "if" || text === "while" || text === "for" || text === "with" || text === "catch") {
      mount = true;
    }
  }
}
if (!mount) {
  return false;
}
bracket.CatalogGuide = new CatalogGuide(
  BlockPossibleShape.CreateBodyPossibleShapes(),
  new BlockBodyWaitingPossibleShape());
StatementRouteUtil.ControlFlowBodyBraceCount += 1;
return true;
```

## static method OnChildBracketCreated:(parent:Token, bracket:Token, context:SyntaxContext)=>void

内部括号创建事件（由 `Bracket.OnBracketCreatedEvent` 转调）：**只给类体括号里的方法 / 构造器 / 访问器体**挂
块体目录。判据是宿主括号的成员目录里有没有 `MethodDeclarationPossibleShape`（类体目录唯一的成员），这样
对象字面量方法体、箭头块体即使 `{` 前面同样是 `)` / 类型，也不会被挂上目录（它们的建树路径不经过
`StatementBuilder.BuildBlock`，挂目录只会让形状泄漏）。

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableBlockBodyCatalog) {
  return;
}
if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "{") {
  return;
}
if (parent instanceof StatementShape) {
  // 语句壳上的子括号：只有**箭头块体**走这里（`x => { … }` 的 `{` 前面是 `=>`，不是 `)`）。
  // 根层 `const f = () => { … }` / 块内 `{ const f = () => { … }; }` 的父单元都是语句壳。
  if (!StatementRouteUtil.EnableArrowBodyCatalog) {
    return;
  }
  BlockPossibleShape.TryMountFunctionBody(parent, bracket, context, true);
  return;
}
if (!(parent instanceof Bracket)) {
  return;
}
const body = parent as Bracket;
const previous = BlockPossibleShape.PreviousCodeUnit(parent, bracket);
if (previous !== null && BlockPossibleShape.IsArrowUnit(previous)) {
  // 箭头块体，宿主是括号（调用参数 / 数组 / 括号内的箭头）：`f(x => { … })`。
  if (!StatementRouteUtil.EnableArrowBodyCatalog) {
    return;
  }
  BlockPossibleShape.TryMountFunctionBody(parent, bracket, context, true);
  return;
}
if (previous !== null && BlockPossibleShape.IsSwitchCaseBody(body, bracket, previous)) {
  // **case 体的 `{`**（Stage 4p）：`switch (x) { case 1: { … } }`。挂上块体目录后，体内语句由
  // `BuildCaseBlock` → 内层 `BuildStatement()` → `BuildBlock()` → `HasBuiltBodyStatements` /
  // `CollectBodyStatements` 收集——与块体 / 函数体同一条通道，`CaseBlockShape` / `CaseClauseShape`
  // 的建树路径一个字不改。`case 1: f();` 这种**不在 `{}` 里的子句语句**仍留 raw（未接管，树仍正确）。
  if (BlockPossibleShape.EnableSwitchCaseBody) {
    // 挂的是**case 体的 `{` 本身**（`bracket`），不是宿主（switch 的 case 块括号 `body`）。
    // 挂错宿主会把整段 `case …` 当语句喂给块体目录 → `case 1:` 抛 `SourceRange is not set`。
    const caseBody = bracket as Bracket;
    if (caseBody.CatalogGuide === null) {
      BlockPossibleShape.MountBodyCatalog(caseBody);
      BlockPossibleShape.SwitchCaseBodyMountCount += 1;
    }
  }
  return;
}
if (BlockPossibleShape.IsFunctionDeclarationBody(parent, bracket)) {
  // **块内 / 体内的函数声明体**（Stage 4p）：`{ function f(){ let x = 1; } f(); }`。声明本身没有壳
  // （块体目录里不补声明族候选），体括号却在 raw 递归的 `BuildFunctionDeclaration` → `BuildBlock()`
  // 上，所以只挂目录就能让体内语句走收集通道：mount > 0、XML / AST 与 legacy 逐字节一致。
  if (BlockPossibleShape.EnableBlockFunctionBody) {
    // 挂的是**函数体 `{` 本身**（`bracket`）。挂到宿主（外层块括号）会覆盖外层块体目录，
    // 体内语句永远走不到 `BuildBlock()` 的收集通道（mount +1 / body +0 的根因）。
    const fnBody = bracket as Bracket;
    if (fnBody.CatalogGuide === null) {
      BlockPossibleShape.MountBodyCatalog(fnBody);
      BlockPossibleShape.BlockFunctionBodyMountCount += 1;
    }
  }
  return;
}
if (body.CatalogGuide === null) {
  // **对象字面量方法体**（Stage 4o）：宿主括号没有目录，说明它是对象字面量 / 数组 / 调用参数，
  // 不是块体（块体括号建壳时就挂了目录）。成员体的建树是 `ExpressionBuilder.ParseObjectLiteral`
  // 里的 `new StatementBuilder(...).BuildStatement()`，落到 `BuildBlock()` → `HasBuiltBodyStatements`
  // / `CollectBodyStatements`，与函数体**同一条收集通道**，所以挂目录不会泄漏形状。
  if (StatementRouteUtil.EnableObjectMethodBodyCatalog) {
    BlockPossibleShape.TryMountFunctionBody(parent, bracket, context);
  }
  return;
}
let classBody = false;
for (const shape of body.CatalogGuide.PossibleShapes) {
  if (shape.constructor.name === "MethodDeclarationPossibleShape") {
    classBody = true;
    break;
  }
}
if (!classBody) {
  return;
}
BlockPossibleShape.TryMountFunctionBody(parent, bracket, context);
```

## static method TryMountFunctionBody:(unit:Token, bracket:Token, context:SyntaxContext, arrowOnly?:bool)=>bool

给**函数体括号**挂块体语句目录（Stage 4j 步骤 3）。挂载点只有一个判据：新括号是 `{`、且宿主 `Data` 里
它前面那个非 trivia 单元是一个**已闭合的 `(` 括号单元**。本语法里 `(` `)` 是**同一个** `Bracket` 单元，
所以「`)` 之后紧跟 `{`」在这里落地为「前一个单元是 `StartBracketChar === "("` 且 `Closed` 的括号」。

**为什么不在这里判「这是不是函数体」**：`function f() {}` / `m() {}` / `constructor() {}` / `if (x) {}` 的
`{` 前面都是同一个形状，本语法没有第二个本地判据能区分它们；而**挂目录本身不改任何 AST 决定**——目录里的
候选各自用自己的壳收口，`BlockBodyWaitingPossibleShape` 保证「一个候选都不接」时目录**不抛错**（S4i §3
的抛错出口只在 `EndPossible === null` 时存在）。真正决定「谁建这些语句」的是收口侧
`StatementBuilder.BuildBlock` → `HasBuiltBodyStatements` / `CollectBodyStatements`（与块体同一条通道），
所以判据宽一点只会让更多语句走已有的收集通道，而不是换一条建树路径。

**与 S4i 方案 A 的区别**：这里给**新括号**挂目录，**不重算宿主目录**。S4i 全表红的根因是
「子括号刚建、还没闭合」时回调宿主 `ComputePossibleShapesByIndex`，让宿主 `Candidates` 合法地全被拒、
落进 `size === 0 && EndPossible === null` 的抛错出口。本方法只读宿主 `Data` 找前一个单元，
不调用任何 `ComputePossibleShapes*`。

**安全回退**：宿主目录照旧在括号闭合时判定，`StatementShape.DetachShell` / `CollectBodyStatements` 的
raw 段建与「未收口壳抛错 → 文件级 fallback」两条兜底完全不变。

```ts
if (!(bracket instanceof Bracket)) {
  return false;
}
const body = bracket as Bracket;
if (body.StartBracketChar !== "{") {
  return false;
}
if (body.CatalogGuide !== null) {
  return false;
}
let previous:Token | null = null;
for (let at = unit.Data.length - 1; at >= 0; at--) {
  const item = unit.Data[at];
  if (item === bracket || item.IsTriviaToken) {
    continue;
  }
  previous = item;
  break;
}
if (previous === null) {
  return false;
}
const arrow = BlockPossibleShape.IsArrowUnit(previous);
if (arrowOnly === true && !arrow) {
  return false;
}
if (!arrow) {
  const closedParameters = previous instanceof Bracket
    && (previous as Bracket).StartBracketChar === "("
    && (previous as Bracket).Closed;
  if (!closedParameters && !BlockPossibleShape.IsReturnTypeBrace(unit.Data, unit.Data.length - 1)) {
    // 带返回类型：`function g(): number {` / `function h(): { a: number } {`。
    return false;
  }
}
body.CatalogGuide = new CatalogGuide(
  BlockPossibleShape.CreateBodyPossibleShapes(),
  new BlockBodyWaitingPossibleShape());
BlockPossibleShape.FunctionBodyMountCount += 1;
if (arrow) {
  BlockPossibleShape.ArrowBodyMountCount += 1;
}
return true;
```


# class AwaitStatementPossibleShape extends PossibleShape

**块体目录里的 `await` 起点语句候选**（Stage 4l）。

`await` 在冻结的 `StatementRouteUtil.IsLegacyKeyword` 里是**双角色起点**：`await f()` 的关键字前缀，
与旧式 `await` 标识符 / 标签（`{ await: f(); }`）都能起一条语句，所以 `Decide` 一律判成
`StatementRoute.Legacy`，根层照旧由 `StatementPossibleShape` 原子建树，行为一字不改。

块体目录里**没有** legacy 候选，`async function a(){ await f(); }` 的 `await` 语句因此只能整段留在 raw 段：
`BlockBodyStatementCount` 不增（`BuildBlock` 的 legacy 递归仍能建对树，所以这是「未接管」而不是「建错」）。
本候选只在**块体目录**（`CreateBodyPossibleShapes`）里补这一条入口，根目录不注册。

**判界与建树完全复用控制流壳的同一份机制**：壳 `Kind = StatementRoute.ShellStatementFamily`、
终结候选 `StatementKind = StatementRoute.ShellStatementFamily` → 沿用 legacy 的 `StatementScanner.ScanRoot`
判界；收口时 `StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement` 用**同一段 raw 单元**
建树。所以 XML 逐字节、AST 逐节点与 legacy 一致，接管只体现在 `AwaitShellCount` 上。

**只认首代码单元那一格**：建壳之后本条语句归壳，后续格子由壳的终结候选判界；`Reject` 被 `CatalogGuide`
永久删除，所以首代码单元还没到（只有 trivia）必须 `Uncertain`。

**互斥（不靠先后）**：`ControlFlowStatementPossibleShape` / `RootExpressionStatementPossibleShape` /
`VariableStatementPossibleShape` / `BlockPossibleShape` 对 `await` 首格全部 `Reject`（`Decide` 给 `Legacy`、
首单元不是 `let` / `{`），本候选只对「块体宿主 + `await` 首单元」`Accept`，两边永不同格成立。

## static method IsAwaitHead:(unit:Token)=>bool

`unit` 是不是 `await` 关键字。只看 `Common` 的文本，不建状态。
```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "await";
```

## static method IsBlockHost:(host:Token | null)=>bool

宿主是不是**块体 `{` 括号**（块体目录的宿主）。根层宿主是 `SourceFileShape`，不命中——本候选在根层永远不接。
```ts
if (!(host instanceof Bracket)) {
  return false;
}
return (host as Bracket).StartBracketChar === "{";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableAwaitStatement) {
  return ShapeStates.Reject;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
if (!AwaitStatementPossibleShape.IsAwaitHead(units[headAt])) {
  return ShapeStates.Reject;
}
const owner = units[headAt].Parent;
if (owner === null) {
  return ShapeStates.Uncertain;
}
if (!AwaitStatementPossibleShape.IsBlockHost(owner)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳；建壳不需要等语句结束。
```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableAwaitStatement) {
  return false;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken || tokenIndex !== headAt) {
  return false;
}
if (!AwaitStatementPossibleShape.IsAwaitHead(units[headAt])) {
  return false;
}
return AwaitStatementPossibleShape.IsBlockHost(units[headAt].Parent);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

与 `ControlFlowStatementPossibleShape.BuildByIndex` 逐字同构：搬 raw 单元、`Pos` 取「前一个非 trivia 单元
`EndIndex`」（宿主是块体 `{` 括号时首句取 `StartIndex + 1`，与 legacy `BuildBlock` 的 `base` 同口径）、
原位插回壳、`Parent` / `MountedUnit` 显式设置。唯一的族标记固定为 `StatementRoute.ShellStatementFamily`
（不看 `Decide` 给的 `Legacy`——`Legacy` 不是壳族标记）。
```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("await 语句候选没有可搬的单元");
}
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  let previous = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous < 0) {
    if (host.SourceRange.StartIndex >= 0) {
      pos = host.SourceRange.StartIndex + 1;
    }
  } else {
    const previousEnd = host.Data[previous].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
  }
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
shell.Kind = StatementRoute.ShellStatementFamily;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = StatementRoute.ShellStatementFamily;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
StatementRouteUtil.AwaitShellCount += 1;
return shell;
```

# class YieldStatementPossibleShape extends PossibleShape

**块体目录里的 `yield` 起点语句候选**（Stage 5d-4）。

与 `AwaitStatementPossibleShape`（Stage 4l）**逐字同构**：`yield` 同样是冻结的
`StatementRouteUtil.IsLegacyKeyword` 里的**双角色起点**——生成器里 `yield 1` / `yield` / `yield* xs` 是
`YieldExpression` 的关键字前缀，非生成器 / 非严格上下文里 `yield` 还能是标识符（`yield = 1`）或标签
（`yield: 1`），所以 `Decide` 一律判成 `StatementRoute.Legacy`。根层照旧由 `StatementPossibleShape` 原子建树，
行为一字不改；块体目录里没有 legacy 候选，`function* g() { yield 1; }` 的体因此整段留在 raw 段
（`BuildBlock` 的 legacy 递归仍能建对树——那是「未接管」，不是「建错」）。

**为什么这一族值得单独补**：它是退场指标 `RawTailBuildCount` 里最大的一族（`yield` 各种形态合计约占四成）。
补上之后生成器体内的 `yield` 语句由本候选建壳、`CollectBodyStatements` 按序收，raw 段只剩它旁边仍未接管的语句。

**判界与建树都复用 legacy 的同一份实现**：壳 `Kind` 与终结候选都取 `StatementRoute.ShellStatementFamily`
→ 判界沿用 `StatementScanner.ScanRoot`（`yield` 的受限产生式 / ASI / `;` 由扫描器说，与 legacy 根候选同一份），
收口时 `StatementShape.BuildFromShell` → `StatementFamilyDispatch` → `StatementBuilder.BuildExpressionStatement`
用**同一段 raw 单元、同一个建造器**建树。所以 XML 逐字节、AST 逐节点与 legacy 一致，接管只体现在
`YieldShellCount` 上。20 条专用对拍（含 `yield⏎(x)` / `yield⏎x` / `yield 1` ⏎ `yield* other()` / 标签 / 赋值）
全部 AST+Pos 一致、**文件级 fallback = 0**。

**已知代价（下一阶段的入口）**：走 `ScanRoot` 判界意味着这一族每格都 +1 `ScanRoot`——实测 `ScanRootCallCount`
19243 → 19427（+184），同时 `RawTailBuildCount` 292 → 218（−74）。**不建议**把它改成表达式族判据
（`ShellPlainExpression` + `CanEndStatement`）：`CanEndStatement` 到不了 `yield` 的受限产生式那一格，
`yield⏎(x)` 会被收进同一个壳而建造器只建 `yield`，随即「语句没有读完」→ 文件级重解析（实测 20 条探针里 4 条）。
真正的归零办法是像 5d-2a/5d-2b 那样在 boundary 层补 `yield` 族判界（`IsYieldFamilyCode` + 专用终结候选），
那需要新增一个 `StatementKind` / 专用终结形状，超出本轮预算——留给下一阶段。

**只认首代码单元那一格**：建壳之后本条语句归壳，后续格子由壳的终结候选判界；`Reject` 被 `CatalogGuide`
永久删除，所以首代码单元还没到（只有 trivia）必须 `Uncertain`。

**互斥（不靠先后）**：`ControlFlowStatementPossibleShape` / `RootExpressionStatementPossibleShape` /
`VariableStatementPossibleShape` / `BlockPossibleShape` / `DeclarationStatementPossibleShape` 对 `yield` 首格
全部 `Reject`（`Decide` 给 `Legacy`、首单元不是 `let` / `{` / 声明头），本候选只对「块体宿主 + `yield` 首单元」
`Accept`，两边永不同格成立。与 `AwaitStatementPossibleShape` 也不会同格：首代码单元文本互斥。

## static method IsYieldHead:(unit:Token)=>bool

`unit` 是不是 `yield` 关键字。只看 `Common` 的文本，不建状态。
```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "yield";
```

## static method IsBlockHost:(host:Token | null)=>bool

宿主是不是**块体 `{` 括号**（块体目录的宿主）。根层宿主是 `SourceFileShape`，不命中——本候选在根层永远不接。
```ts
if (!(host instanceof Bracket)) {
  return false;
}
return (host as Bracket).StartBracketChar === "{";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableYieldStatement) {
  return ShapeStates.Reject;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Reject;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
if (tokenIndex !== headAt) {
  return ShapeStates.Reject;
}
if (!YieldStatementPossibleShape.IsYieldHead(units[headAt])) {
  return ShapeStates.Reject;
}
const owner = units[headAt].Parent;
if (owner === null) {
  return ShapeStates.Uncertain;
}
if (!YieldStatementPossibleShape.IsBlockHost(owner)) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

首代码单元到齐即可建壳；建壳不需要等语句结束。
```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableYieldStatement) {
  return false;
}
const start = ItemUtil.ItemStartCached(units, cache);
const headAt = ItemUtil.NextCode(units, start);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
if (units[tokenIndex].IsTriviaToken || tokenIndex !== headAt) {
  return false;
}
if (!YieldStatementPossibleShape.IsYieldHead(units[headAt])) {
  return false;
}
return YieldStatementPossibleShape.IsBlockHost(units[headAt].Parent);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

与 `AwaitStatementPossibleShape.BuildByIndex` 逐字同构：搬 raw 单元、`Pos` 取「前一个非 trivia 单元
`EndIndex`」（宿主是块体 `{` 括号时首句取 `StartIndex + 1`，与 legacy `BuildBlock` 的 `base` 同口径）、
原位插回壳、`Parent` / `MountedUnit` 显式设置。族标记固定为 `StatementRoute.ShellStatementFamily`
（不看 `Decide` 给的 `Legacy`——`Legacy` 不是壳族标记）。
```ts
const start = ItemUtil.ItemStart(host.Data);
if (start > tokenIndex) {
  throw new Error("yield 语句候选没有可搬的单元");
}
let pos = 0;
if (host instanceof Bracket && (host as Bracket).StartBracketChar === "{") {
  let previous = -1;
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      previous = at;
      break;
    }
  }
  if (previous < 0) {
    if (host.SourceRange.StartIndex >= 0) {
      pos = host.SourceRange.StartIndex + 1;
    }
  } else {
    const previousEnd = host.Data[previous].SourceRange.EndIndex;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
  }
} else {
  for (let at = start - 1; at >= 0; at--) {
    if (!host.Data[at].IsTriviaToken) {
      const previousEnd = host.Data[at].SourceRange.EndIndex;
      if (previousEnd >= 0) {
        pos = previousEnd;
      }
      break;
    }
  }
}
const moved:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, moved.length);
const shell = new StatementShape(host.Template);
shell.Pos = pos;
shell.Kind = StatementRoute.ShellStatementFamily;
for (const item of moved) {
  shell.Add(item);
}
const headStart = moved[0].SourceRange.Start;
if (headStart >= 0) {
  shell.SignIn(headStart);
}
const endShape = new StatementEndPossibleShape();
endShape.StatementKind = StatementRoute.ShellStatementFamily;
shell.CatalogGuide = new CatalogGuide([], endShape);
host.Data.splice(start, 0, shell);
shell.Parent = host;
host.MountedUnit = shell;
StatementRouteUtil.YieldShellCount += 1;
return shell;
```
