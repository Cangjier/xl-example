# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
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

## static method EnclosedByTypeBody:(unit:Token)=>bool

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
