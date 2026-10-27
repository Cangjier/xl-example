# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket, BracketChildCreatedHook } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../core/syntax/possible-shape-cache.xl.md"
import { PossibleSource } from "../../../core/syntax/possible-source.xl.md"
import { ShapeStates } from "../../../core/syntax/shape-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { BodyGuideUtil } from "../declarations/body-guide-util.xl.md"
import { EndOfFileTokenShape } from "../trivia/end-of-file-token-shape.xl.md"
import { ControlFlowStatementPossibleShape } from "./control-flow-statement-possible-shape.xl.md"
import { CaseClauseHeadPossibleShape } from "./case-clause-head-possible-shape.xl.md"
import { CaseClauseStatementPossibleShape } from "./case-clause-statement-possible-shape.xl.md"
import { DeclarationStatementPossibleShape } from "./declaration-statement-possible-shape.xl.md"
import { RootExpressionStatementPossibleShape } from "./root-expression-statement-possible-shape.xl.md"
import { StatementEndPossibleShape } from "./statement-end-possible-shape.xl.md"
import { StatementRoute } from "./statement-route-util.xl.md"
import { StatementRouteUtil } from "./statement-route-util.xl.md"
import { StatementShape } from "./statement-shape.xl.md"
import { StatementShellCatalog } from "./statement-shell-catalog.xl.md"
import { VariableStatementPossibleShape } from "./variable-statement-possible-shape.xl.md"
import { DirectStatementHook } from "../direct/direct-statement-hook.xl.md"
```

# namespace cangjie

# class BlockBodyWaitingPossibleShape extends PossibleShape

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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

## static field EnableBlockDeclarationCatalog:bool = true

## private static field CreateBodyPossibleShapesCache:Array<PossibleShape> | null = null

## static method CreateBodyPossibleShapes:()=>Array<PossibleShape>

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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
// H3-b（R3-CONTRACT §4.1）：与 control-flow 候选同一句、同一个挂载点（kind = ShellBlock）。
DirectStatementHook.Attach(shell, context);
// [XL-ROUTE:block] B1：增量总闸打开时给块壳挂早期 `BlockShape` 占位节点（类名 / Pos 抄 legacy），
// 收口时由 `StatementFamilyDispatch.Build` 搬进 legacy 子树。开关关闭时本句不进。
if (StatementRouteUtil.IsIncrementalShapesEnabled()) {
  let headUnit:Token | null = null;
  for (const item of moved) {
    if (!item.IsTriviaToken) {
      headUnit = item;
      break;
    }
  }
  if (headUnit !== null) {
    StatementShellCatalog.Attach(shell, headUnit, StatementRoute.ShellBlock);
  }
}
return shell;
```

## static field FunctionBodyMountCount:int = 0

## static field ArrowBodyMountCount:int = 0

## static field SwitchCaseBodyMountCount:int = 0

## static field BlockFunctionBodyMountCount:int = 0

## static field EnableSwitchCaseBody:bool = true

## static field EnableBlockFunctionBody:bool = true

## static field EnableStaticBlockBody:bool = true

## static field StaticBlockBodyMountCount:int = 0

## static field EnableFunctionExpressionBody:bool = true

## static field FunctionExpressionBodyMountCount:int = 0

## static method MountBodyCatalog:(bracket:Bracket)=>void

```ts
bracket.CatalogGuide = new CatalogGuide(
  BlockPossibleShape.CreateBodyPossibleShapes(),
  new BlockBodyWaitingPossibleShape());
```

**[WP-S1] 记录一次被否掉的方案**（不要再用；[T7d] 已删掉从未接线的
`MountControlFlowBodyCatalog`，只留结论）：函数体只挂控制流族候选、其余语句留 raw。
实测不可行——目录里没有变量 / 表达式候选时，raw 单元会一直攒在括号 `Data` 里，
`ItemUtil.ItemStart` 永远停在体内第一条语句上，`Decide` 每格读到的首词都是那个词（`let`），
后面的 `switch` 一格都拿不到：`SwitchStatementShape` 首见从 69 退到 268、
`SwitchCaseClauseMountCount` 归 0。函数体必须挂**完整**块体目录。

## static method IsSwitchCaseBody:(body:Bracket, bracket:Token, previous:Token | null)=>bool

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

```ts
if (!(unit instanceof Bracket)) {
  return false;
}
return (unit as Bracket).StartBracketChar === "(" && (unit as Bracket).Closed;
```

## static method IsAllCloseAngle:(text:string)=>bool

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

## static method IsFunctionDeclarationBody:(host:Token, bracket:Token, allowAnonymous?:bool)=>bool

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
// **Stage 5d-8a：返回类型自己收在一个括号里时先认它**（`function f(x: unknown): x is (string) { … }` /
// `m(): (a: number) => void { … }` / `m(): () => void { … }`）。这类体 `{` 前面那个**已闭合的括号**
// 是**返回类型**的一部分、不是形参表，往下走「参数表 → 名字 → `function`」的常规路径会把它当形参表，
// 于是要求它前面是名字 → 落空 → 体不挂目录（5d-8a 归因里 `x is (string)` / `(a: number) => void`
// 两组 `return`）。`IsReturnTypeBrace` 回答的正是「`{` 前面是收住的类型，再往前是本条声明的 `:`，
// 且 `:` 前面是已闭合的形参表」——命中的就一定是带体声明的体，不需要再确认名字 / `function`。
if (BlockPossibleShape.IsReturnTypeBrace(data, braceAt)) {
  return true;
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
// **Stage 5d-8a：函数表达式体允许省略名字**（`const f = function (a) { … }`）。
// 名字位置可以是三种：`*`（`function* () { … }`，匿名生成器）、`function`（`function (a) { … }`，
// 匿名函数）、或函数名（`function g(a) { … }`，具名）。匿名时 `function` 就在名字位置本身：
// 只要这一格是 `function` 就命中，不需要再往回走一格。
// 其余判据（类型参数 / 参数表 / 体位置）一个字不改。
if (allowAnonymous ?? false) {
  if (at >= 0 && data[at] instanceof Symbol && (data[at] as Symbol).Is("*")) {
    at--;
    while (at >= 0 && data[at].IsTriviaToken) {
      at--;
    }
  }
  if (at >= 0 && data[at] instanceof Common && (data[at] as Common).TempToString() === "function") {
    return true;
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

```ts
if (!(unit instanceof Symbol)) {
  return false;
}
return (unit as Symbol).Is("=>");
```

## static method PreviousCodeUnit:(unit:Token, bracket:Token)=>Token | null

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

```ts
if (Bracket.ChildBracketCreatedHook === null) {
  Bracket.ChildBracketCreatedHook = new BlockBodyChildBracketHook();
}
```

## private static method CanEndTypeUnit:(unit:Token)=>bool

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
    // **Stage 5d-8a：`extends` 不在停止表里**——它也是**条件类型**的词（`m(): U extends any ? U : never {`），
    // 5d-8a 之前它让这类返回类型的体永远挂不上目录。真正的 `class C extends B {` / `interface I extends J {`
    // 不会误挂：本方法最终要求冒号前面是**已闭合的形参表**，而这两族往回扫到 `class` / `interface`
    // （仍在停止表里）就返回 false。
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
    if (symbol.Is(";") || symbol.Is("=")) {
      return false;
    }
  }
}
return false;
```

## static method IsSwitchKeywordShell:(shell:Token)=>bool

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
  // [S6] **子句头候选只在增量模式下参与**：`IsIncrementalShapesEnabled()` 是这道挂载的第三道闸。
  // 它不是 legacy 能力——`CaseClauseHeadPossibleShape.BuildByIndex` 建的是
  // `StatementShape(Kind = ShellCaseClauseHead)` 的**增量壳**，只有增量模式才会由
  // `StatementShellCatalog.Attach` 把它换成 `CaseClauseShape` / `DefaultClauseShape` 占位节点
  //（门控在本类同族文件 `case-clause-head-possible-shape.xl.md` 的 `BuildByIndex` 末尾）。
  // legacy 模式下若也由它建壳，`StatementBuilder.BuildCaseBlock` 收到的就是
  // 「既不是 `CaseClauseShape` 也不是 `DefaultClauseShape` 的非 basic 单元」⇒ 抛
  // 「switch 块里出现了 case / default 之外的单元」⇒ switch 语句收不了口 ⇒ 根层
  // `StatementPossibleShape` 活到 EOF、与 `SourceFileEndPossibleShape` 同格成立 ⇒
  // `CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape）`。
  // 实测（wide-ast 全量 2566 份语料）：S1 之前 0 崩溃；不加上这道门控时
  // `tests/cases/token/statements/stmt-switch-comment-before-case.ts`（下标 19）与
  // `stmt-switch-inline-terminator-comment.ts`（下标 25）崩溃。关掉 `EnableSwitchCaseClauseHead`
  // 也能消红，但那是把 S1 的增量能力一起关掉（control-flow / switch-fallthrough 的 S1 验收会退回
  // legacy），所以门控必须挂在**模式**上，不能挂在功能开关上。
  if (StatementRouteUtil.EnableSwitchCaseClause && StatementRouteUtil.EnableSwitchCaseClauseHead
    && StatementRouteUtil.IsIncrementalShapesEnabled()) {
    // [WP-S1] 子句块目录 = **子句头候选在前、子句语句候选在后**。顺序不可颠倒：
    // `case` / `default` 那一格必须由 `CaseClauseHeadPossibleShape` 先接住并建壳，否则它落进
    // 子句语句候选、被当成表达式语句（`IdentifierShape("case")`）或标签（`LabeledStatementShape`）。
    // 子句语句候选在 `StatementRouteUtil.Decide` 判成 `ShellCaseClauseHead` 的格子里 `Reject`（让位），
    // 所以同格不会双 Accept。
    body.CatalogGuide = new CatalogGuide(
      [new CaseClauseHeadPossibleShape(), new CaseClauseStatementPossibleShape()],
      new BlockBodyWaitingPossibleShape());
    StatementRouteUtil.SwitchCaseClauseMountCount += 1;
  } else if (StatementRouteUtil.EnableSwitchCaseClause) {
    // [S6] 非增量模式，或子句头开关关闭：逐字节退回「只挂子句语句候选」的既有目录
    //（WP-S1 之前的行为；wide-ast / legacy 解析走的正是这一支）。
    body.CatalogGuide = new CatalogGuide(
      [new CaseClauseStatementPossibleShape()],
      new BlockBodyWaitingPossibleShape());
    StatementRouteUtil.SwitchCaseClauseMountCount += 1;
  }
  return;
}
if (BlockPossibleShape.TryMountControlFlowBody(shell, body, context,
  StatementRouteUtil.EnableLabelBodyCatalog)) {
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

## static method TryMountControlFlowBody:(shell:Token, bracket:Bracket, context:SyntaxContext, allowLabel?:bool)=>bool

```ts
if (!(shell instanceof StatementShape)) {
  return false;
}
const shellKind = (shell as StatementShape).Kind;
if (shellKind !== StatementRoute.ShellStatementFamily && shellKind !== StatementRoute.ShellLabel) {
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
const controlHead = headText === "if" || headText === "while" || headText === "do"
  || headText === "for" || headText === "with" || headText === "try";
// **Stage 5d-6（B）**：`allowLabel === true` 时也认「`标识符 :`」的标签壳——体位置的判据一个字不改。
let labelHead = false;
if (!controlHead && (allowLabel ?? false) && shellKind === StatementRoute.ShellLabel) {
  let colonAt = head + 1;
  while (colonAt < data.length && data[colonAt].IsTriviaToken) {
    colonAt++;
  }
  labelHead = colonAt < data.length && data[colonAt] instanceof Symbol
    && (data[colonAt] as Symbol).Is(":");
}
if (!controlHead && !labelHead) {
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
if (labelHead && before instanceof Symbol && (before as Symbol).Is(":")) {
  // `lbl: { … }`：标签体就是紧跟 `:` 的那个块。
  mount = true;
}
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
    } else if (text === "await") {
      // **Stage 5d-8a：`for await (…) { … }`**。`for await` 的体位置回看一格是 `await`、再往前一格才是
      // `for`，只回看一格永远不成立（5d-6 §5 明确记下的已知小缺口，归属 `await` 那 3 条里的 2 条）。
      // 这里只在**紧邻 `await` 的前一格**是 `for` 时认——`x = await (…) { … }` 这种形态不可能出现在
      // 语句首的体位置（`await (…)` 后面跟 `{` 只会是块语句，由 `Decide` 判成 `ShellBlock`）。
      let beforeAwait = keyword - 1;
      while (beforeAwait >= 0 && data[beforeAwait].IsTriviaToken) {
        beforeAwait--;
      }
      if (beforeAwait >= 0 && data[beforeAwait] instanceof Common
        && (data[beforeAwait] as Common).TempToString() === "for") {
        mount = true;
      }
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
if (labelHead) {
  StatementRouteUtil.LabelBodyMountCount += 1;
}
return true;
```

## static method OnChildBracketCreated:(parent:Token, bracket:Token, context:SyntaxContext)=>void

```ts
if (!StatementRouteUtil.EnableShellExpressions || !StatementRouteUtil.EnableBlockBodyCatalog) {
  return;
}
if (!(bracket instanceof Bracket) || (bracket as Bracket).StartBracketChar !== "{") {
  return;
}
if (parent instanceof StatementShape) {
  // 语句壳上的子括号：**箭头块体**（`x => { … }`，`{` 前面是 `=>`）与 **5d-8a 起的函数表达式体**
  // （`const f = function (a) { … }`，`{` 前面是 `)`）。根层 `const f = () => { … }` / 块内
  // `{ const f = () => { … }; }` 的父单元都是语句壳。
  if (StatementRouteUtil.EnableArrowBodyCatalog
    && BlockPossibleShape.TryMountFunctionBody(parent, bracket, context, true)) {
    return;
  }
  // **函数表达式体**（Stage 5d-8a）：判据与块内函数声明体同一份（`IsFunctionDeclarationBody`，
  // 名字可省略）。只挂在这个 `{` 自己身上，建树仍走 `ExpressionBuilder` → `BuildBlock()` 的收集通道。
  if (BlockPossibleShape.EnableFunctionExpressionBody
    && BlockPossibleShape.IsFunctionDeclarationBody(parent, bracket, true)) {
    const expressionBody = bracket as Bracket;
    if (expressionBody.CatalogGuide === null) {
      BlockPossibleShape.MountBodyCatalog(expressionBody);
      BlockPossibleShape.FunctionExpressionBodyMountCount += 1;
    }
  }
  return;
}
if (!(parent instanceof Bracket)) {
  return;
}
const body = parent as Bracket;
const previous = BlockPossibleShape.PreviousCodeUnit(parent, bracket);
// **类静态块体**（Stage 5d-8a）：`class C { static { … } }` 的体 `{` 前一个非 trivia 单元是 `static`。
// 类体括号是 legacy 建树的（没有目录），`TryMountFunctionBody` 的 `)` / 返回类型判据又不覆盖它，
// 于是静态块体整段走 `BuildBlock` 的 raw 循环。判据只看这一个词。
if (previous !== null && previous instanceof Common
  && (previous as Common).TempToString() === "static") {
  if (BlockPossibleShape.EnableStaticBlockBody) {
    const staticBody = bracket as Bracket;
    if (staticBody.CatalogGuide === null) {
      BlockPossibleShape.MountBodyCatalog(staticBody);
      BlockPossibleShape.StaticBlockBodyMountCount += 1;
    }
  }
  return;
}
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

## static method EnclosedByTypeBody:(unit:Token)=>bool

`unit` 所在的**最近一个带目录的括号**是不是类型体。

只服务 `=>` 之后那个 `{`：`interface I { m(cb: () => { a: number }): void }` 里它前一个是 `=>`，
看起来像箭头块体，其实是**函数类型返回的类型字面量**。它的父括号链是
「方法形参表 `(`（Fallback，没目录）→ 接口成员列表 `{`（`MemberList`，有目录）」——
类型体里不可能出现语句，所以这一格不能挂块体目录（挂上之后 `{ a: number }` 会被收成
`LabeledStatementShape`，`TypeBuilder` 再报「不支持的对象类型成员」）。

反向的三族都**不让路**（它们的最近目录括号不是类型体）：

- `x => { … }`（语句壳宿主）：父单元不是括号，本方法在 `TryMountFunctionBody` 里只对
  `=>` 单独调用，查到的最近目录括号是**外层函数体**（`FunctionBody`，角色为空）；
- `{ m() { … } }` / `class C { m() { … } }`：`{` 前一个是 `)` 不是 `=>`，走不到本判据；
- `{ cb: (a) => {} }`：最近目录括号是对象字面量的 `{`（`ObjectLiteral`）。

角色串与 `BracketRole.MemberList` / `BracketRole.TypeLiteral` 同值（本文件不 import
`bracket-role-resolver`，避开语句族 → 括号角色表那条回边）。

```ts
if (unit === null) {
  return false;
}
let at:Token | null = unit;
let guard = 0;
while (at !== null && guard < 64) {
  guard++;
  const parent:Token | null = at.Parent;
  if (parent === null) {
    return false;
  }
  if (parent instanceof Bracket) {
    const bracket = parent as Bracket;
    if (bracket.CatalogGuide !== null) {
      return bracket.Role === "MemberList" || bracket.Role === "TypeLiteral";
    }
  }
  at = parent;
}
return false;
```

## static method TryMountFunctionBody:(unit:Token, bracket:Token, context:SyntaxContext, arrowOnly?:bool)=>bool

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
if (arrow && BlockPossibleShape.EnclosedByTypeBody(unit)) {
  // 类型体里的 `=> {` 不是箭头块体，是函数类型返回的类型字面量（见 `EnclosedByTypeBody`）。
  // 不挂目录：`{` 保持 raw，收口格由 `TypeBuilder.ParseTypeLiteral` 整块读。
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

## static method IsAwaitHead:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "await";
```

## static method IsBlockHost:(host:Token | null)=>bool

```ts
if (!(host instanceof Bracket)) {
  return false;
}
return (host as Bracket).StartBracketChar === "{";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
// R5-D3-a（R5-CONTRACT §2.3 / 审批 R5-A3）：与 R3 的两个建壳候选同一条挂载点（唯一实现点 =
// `DirectStatementHook.Attach`）。`ShellStatementFamily(4)` 已经注册给 `ControlFlowStatementDirectSession`
// ⇒ 这一行把 `yield`/`await` 语句壳送进 session；未注册时 `Create` 返回 null，行为逐字节不变。
DirectStatementHook.Attach(shell, context);
StatementRouteUtil.AwaitShellCount += 1;
return shell;
```

# class YieldStatementPossibleShape extends PossibleShape

## static method IsYieldHead:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
return (unit as Common).TempToString() === "yield";
```

## static method IsBlockHost:(host:Token | null)=>bool

```ts
if (!(host instanceof Bracket)) {
  return false;
}
return (host as Bracket).StartBracketChar === "{";
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

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
// R5-D3-a：同 `AwaitStatementPossibleShape.BuildByIndex`（R5-A3 批准的两行之一）。
DirectStatementHook.Attach(shell, context);
StatementRouteUtil.YieldShellCount += 1;
return shell;
```
