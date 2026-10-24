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
  () => [new VariableStatementPossibleShape(), new RootExpressionStatementPossibleShape(), new ControlFlowStatementPossibleShape(), new BlockPossibleShape(), new AwaitStatementPossibleShape()]);
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
if (!(parent instanceof Bracket)) {
  return;
}
const body = parent as Bracket;
if (body.CatalogGuide === null) {
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

## static method TryMountFunctionBody:(unit:Token, bracket:Token, context:SyntaxContext)=>bool

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
if (previous instanceof Bracket
  && (previous as Bracket).StartBracketChar === "("
  && (previous as Bracket).Closed) {
  // `function f() {` / `m() {` / `constructor() {`：`)` 之后紧跟 `{`。
} else if (!BlockPossibleShape.IsReturnTypeBrace(unit.Data, unit.Data.length - 1)) {
  // 带返回类型：`function g(): number {` / `function h(): { a: number } {`。
  return false;
}
body.CatalogGuide = new CatalogGuide(
  BlockPossibleShape.CreateBodyPossibleShapes(),
  new BlockBodyWaitingPossibleShape());
BlockPossibleShape.FunctionBodyMountCount += 1;
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
