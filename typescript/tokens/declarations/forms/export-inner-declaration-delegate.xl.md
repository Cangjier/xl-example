# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { Bracket } from "../../../../core/syntax/basic-tokens/bracket.xl.md"
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { EndOfFileTokenShape } from "../../trivia/end-of-file-token-shape.xl.md"
import { FunctionDeclarationShape } from "../function-declaration-shape.xl.md"
import { IncrementalVariableStatementBuilder } from "../variable-declaration-possible-shape.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { LineTerminator } from "../../../run/line-terminator.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { ReloadMessage } from "../../../../core/syntax/messages/reload-message.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SourceRange } from "../../../../core/syntax/source-range.xl.md"
import { StatementScanner } from "../../statements/statement-scanner.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { TypeBuilder } from "../../types/type-builder.xl.md"
import { BodyGuideUtil } from "../body-guide-util.xl.md"
import { BlockShape } from "../../statements/block-shape.xl.md"
import { DeclareKeywordShape } from "../../keywords/declare-keyword-shape.xl.md"
import { DefaultKeywordShape } from "../../keywords/default-keyword-shape.xl.md"
import { ExportDeclarationPossibleShape } from "../export-declaration-possible-shape.xl.md"
import { ExportKeywordShape } from "../../keywords/export-keyword-shape.xl.md"
import { VariableStatementShape } from "../../statements/variable-statement-shape.xl.md"
```

# namespace cangjie

**export 内层声明委托（WP-A2-D6）。**

```txt
export declare const x: number;          ← 内层是 `declare const` 变量语句
export default function f<T>(a: T): T { return a; }   ← 内层是 `default function` 声明
```

legacy 的 EOF 树里，这两种形态**没有** `ExportDeclarationShape` 包一层：

```txt
export declare const x: number;
└─ VariableStatementShape pos=0 src=[15,31)
   ├─ ExportKeywordShape pos=0
   ├─ DeclareKeywordShape pos=6
   └─ VariableDeclarationListShape pos=14 …

export default function f<T>(a: T): T { return a; }
└─ FunctionDeclarationShape pos=0 src=[15,51)
   ├─ ExportKeywordShape pos=0
   ├─ DefaultKeywordShape pos=6
   ├─ IdentifierShape f / TypeParameterShape T / ParameterShape a / TypeReferenceShape T
   └─ BlockShape
```

所以委托不是「export 壳里再套一个内层壳」，而是**内层声明自己就是最终节点**：`ExportKeywordShape`
（以及 `DefaultKeywordShape`）作为它的前两个 children，`Pos` 取语句首、`src` 从内层声明头（变量关键字 /
`function`）起——与 legacy 逐节点一致。

**为什么必须在内层关键字格建、而不是等 export 收口**：`export default function …` 的 legacy 树在函数体
`}` 那一格就建出来了；只在收口时建 = 与 legacy 同格 = `atomic`。内层壳必须在 `function` 格（变量族在
绑定格）提前挂出，账本才判 `incremental`。

**为什么不能直接改 `ExportDeclarationPossibleShape` 的让位**：root `export` 的路由是
`ShellDeclarationFamily`；根目录里唯一建壳的是 `DeclarationStatementPossibleShape`，它调
`ImportExportDeclarationMount.TryBuild`。export 候选在 `export` 格被让位后**不会再被问到第二格**，
所以委托入口只能挂在这个 mount 上。

时序（streaming，不能往后偷看单元）：

1. `export` 后面的第二个代码单元（`declare` / `default`）到达时，`ImportExportDeclarationMount.TryBuild`
   被调用（`DeclarationStatementPossibleShape` 的 `ShellDeclarationFamily` 路径）；本文件用
   `ProbeKind` **读文档字符**（与 `StatementScanner.NextWord` 同一套空白 / 注释口径）判出内层族，
   不认识（`export declare function` / `export declare class` / `export default class` …）就返回 `null`，
   逐字回既有声明壳。
2. 命中时挂 `ExportInnerDeclarationShape`（临时占位，**不会留在 EOF 树里**），把 `export … 第二个单元`
   搬进去，残留单元按 B5 同一套 `ReloadMessage` 重放。
3. 占位壳的目录里只有 `ExportInnerStartPossibleShape`：它等第三个代码单元
   （`const`/`let`/`var` 与 `function`）到齐，判出内层族并**在自己的位置上换成内层声明**：
   - 变量族：去掉 `export` 单元后整段交给 `IncrementalVariableStatementBuilder.Build(…, declared=true)`
     （D3 已交付的同一建造点），再把 `ExportKeywordShape` 插到语句最前、把 `DeclareKeywordShape.Pos`
     对齐 legacy 的「export 结束」；
   - function 族：换成 `FunctionDeclarationShape` 壳，收口由 `ExportInnerFunctionEndPossibleShape`
     用 legacy 同一个 `FunctionDeclarationShape.FromUnits` 建树，再补 `Export`/`Default` 两个修饰词。

门控：整个入口只在 `StatementRouteUtil.IsIncrementalShapesEnabled()` 为真时动作（由
`ImportExportDeclarationMount.TryBuild` 首行判）；false 时本文件一步不走、legacy 逐字节不变。
根层以外的 `export`（块体 / 模块体）不接管，仍走既有声明壳。

# class ExportInnerDeclarationShape extends ShapeToken

挂载 `export` 与内层声明之间的**临时占位壳**（根单元的挂载单元）。

它只活两格（`declare`/`default` → 内层关键字）：`ExportInnerStartPossibleShape` 建出内层声明后
用 `Token.Replace` 把它自己顶掉，所以 EOF 树里永远不会出现本类节点。

## constructor:(template:Template)=>void

```ts
super(template);
```

# class ExportInnerStartPossibleShape extends PossibleShape

占位壳的**唯一候选**：判出内层族、并在内层关键字格把占位壳换成内层声明。

## static field KindVariable:int = 1

内层是 `declare const|let|var` 变量语句（与 `ExportDeclarationPossibleShape.OwnsExportInner` 的返回值一致）。

## static field KindFunction:int = 2

内层是 `default function` 声明（同上）。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
if (units[tokenIndex].IsTriviaToken) {
  return ShapeStates.Uncertain;
}
const headAt = ItemUtil.NextCode(units, 0);
if (headAt >= units.length || headAt > tokenIndex) {
  return ShapeStates.Uncertain;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length || secondAt > tokenIndex) {
  // 第二个代码单元还没到（`declare` / `default`）：继续等，别把占位壳判死。
  return ShapeStates.Uncertain;
}
const thirdAt = ItemUtil.NextCode(units, secondAt + 1);
if (thirdAt >= units.length || thirdAt > tokenIndex) {
  // 第三个代码单元（变量关键字 / `function`）还没到：族还判不出来。
  return ShapeStates.Uncertain;
}
// 判据的唯一实现是 export 族的 `OwnsExportInner`（`// [A2-D6:OWN]`），本文件不再写第二份关键字表。
if (ExportDeclarationPossibleShape.OwnsExportInner(units, headAt, secondAt, thirdAt) === 0) {
  return ShapeStates.Reject;
}
return ShapeStates.Accept;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, context:SyntaxContext)=>bool

增量变量三层的 `Build` 需要「变量关键字 + 绑定」一起进 `moved`，所以变量族等到绑定格；
function 族是壳（`FunctionDeclarationShape` + `ExportInnerFunctionEndPossibleShape`），关键字格就能挂。

```ts
const headAt = ItemUtil.NextCode(units, 0);
if (headAt >= units.length || headAt > tokenIndex) {
  return false;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length || secondAt > tokenIndex) {
  return false;
}
const thirdAt = ItemUtil.NextCode(units, secondAt + 1);
if (thirdAt >= units.length || thirdAt > tokenIndex) {
  return false;
}
const kind = ExportDeclarationPossibleShape.OwnsExportInner(units, headAt, secondAt, thirdAt);
if (kind === ExportInnerStartPossibleShape.KindFunction) {
  return true;
}
if (kind !== ExportInnerStartPossibleShape.KindVariable) {
  return false;
}
const bindingAt = ItemUtil.NextCode(units, thirdAt + 1);
return bindingAt < units.length && bindingAt <= tokenIndex
  && !(units[bindingAt] instanceof EndOfFileTokenShape)
  && StatementScanner.StartsBinding(units, bindingAt);
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
return ExportInnerDelegate.BuildInner(host, tokenIndex, context);
```

# class ExportInnerFunctionEndPossibleShape extends PossibleShape

`export default function …` 内层 function 壳的**终结候选**。

判据与 `FunctionDeclarationEndPossibleShape` 逐条同源（闭体 `{` / `;` / EOF），建树也复用同一个
`FunctionDeclarationShape.FromUnits`；差别只有两处：壳的 `Data` 前面还留着 `export` / `default`
两个 raw 单元（建树要从 `function` 起），以及建完要把两个修饰词补到 children 最前。

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const unit = units[tokenIndex];
// [B1b] 体 `{` 在创建格已被 `OpenFunctionBody` 包成 `BlockShape`（与 `FunctionDeclarationEndPossibleShape`
// 同一条）：块壳闭合即内层 function 结束。
if (unit instanceof BlockShape) {
  return (unit as BlockShape).Closed ? ShapeStates.Accept : ShapeStates.Reject;
}
if (unit instanceof Bracket && (unit as Bracket).StartBracketChar === "{" && (unit as Bracket).Closed) {
  // 返回类型里的对象字面量（`function f(): { a: A }`）不是函数体：与 legacy 建树同一条判据。
  if (TypeBuilder.IsBodyBrace(units, tokenIndex)) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Reject;
}
if (unit instanceof Symbol && (unit as Symbol).Is(";") && unit.Closed) {
  return ShapeStates.Accept;
}
if (unit instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shell = host as FunctionDeclarationShape;
let exportAt = -1;
let defaultAt = -1;
let functionAt = -1;
for (let at = 0; at < shell.Data.length; at++) {
  const unit = shell.Data[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (!(unit instanceof Common)) {
    continue;
  }
  const text = (unit as Common).TempToString();
  if (text === "export" && exportAt < 0) {
    exportAt = at;
    continue;
  }
  if (text === "default" && defaultAt < 0) {
    defaultAt = at;
    continue;
  }
  if (text === "function") {
    functionAt = at;
    break;
  }
}
if (exportAt < 0 || defaultAt < 0 || functionAt < 0) {
  throw new Error("export 内层声明未支持：export default function 缺少修饰词或 function 关键字");
}
let lastCode = shell.Data.length - 1;
while (lastCode > functionAt && (shell.Data[lastCode].IsTriviaToken || shell.Data[lastCode] instanceof EndOfFileTokenShape)) {
  lastCode--;
}
// 与 legacy 同一个建树函数：`function` 关键字起、到体 `}`（或 `;`）收。
const built = FunctionDeclarationShape.FromUnits(shell, functionAt, lastCode, context, false, false, shell.Pos);
const exportUnit = shell.Data[exportAt];
const exportModifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
exportModifier.Pos = shell.Pos;
if (exportModifier.SourceRange.End < 0 && exportUnit.SourceRange.End >= 0) {
  exportModifier.SignOut(exportUnit.SourceRange.EndIndex);
}
const defaultUnit = shell.Data[defaultAt];
const defaultModifier = new DefaultKeywordShape(shell.Template);
if (defaultUnit.SourceRange.Start >= 0) {
  defaultModifier.SignIn(defaultUnit.SourceRange.StartIndex);
}
if (defaultUnit.SourceRange.End >= 0) {
  defaultModifier.SignOut(defaultUnit.SourceRange.EndIndex);
}
// legacy：`ExportKeyword.Pos` = 语句 Pos，`DefaultKeyword.Pos` = export 的 EndIndex。
defaultModifier.Pos = exportUnit.SourceRange.End < 0 ? shell.Pos : exportUnit.SourceRange.EndIndex;
defaultModifier.TryToClose(context);
built.Data.unshift(defaultModifier);
defaultModifier.Parent = built;
built.Data.unshift(exportModifier);
exportModifier.Parent = built;
built.Pos = shell.Pos;
BodyGuideUtil.FinishShell(host, shell, built);
return built;
```

# class ExportInnerDelegate

export 内层声明委托的入口与建造点。

## static field MountCount:int = 0

增量路径实际接管过的 `export` 内层声明数（证据用；不进 AST、不影响判定）。

## static method InnerStart:(units:Array<Token>)=>int

内层声明的**首代码单元**在 `units` 里的下标（`export` 之后第一个非 trivia 单元 = `declare` / `default`）。

```ts
const headAt = ItemUtil.NextCode(units, 0);
if (headAt >= units.length) {
  return -1;
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length) {
  return -1;
}
return secondAt;
```

## static method ProbeKind:(units:Array<Token>, secondAt:int)=>int

**流式前瞻的唯一一处**：第二个单元（`declare` / `default`）已经到了，第三个单元还没到时，读文档字符
判内层族（与 `StatementScanner.NextWord` 同一套空白 / 注释 / 行终止符口径，不新写词法表）。

- `declare` + **同一行** `const|let|var`（且不是 `const enum`）⇒ `KindVariable`；
- `default` + **同一行** `function` ⇒ `KindFunction`；
- 其余（`export declare function|class|interface|enum|type` / `export default class|interface|async` …）⇒ `0`。

```ts
if (secondAt < 0 || secondAt >= units.length || !(units[secondAt] instanceof Common)) {
  return 0;
}
const secondText = (units[secondAt] as Common).TempToString();
if (secondText !== "declare" && secondText !== "default") {
  return 0;
}
const range = units[secondAt].SourceRange;
const document = range.Document;
if (document === null || range.End < 0) {
  return 0;
}
const count = document.GetCount();
const whole = SourceRange.Whole(document);
const words:Array<string> = [];
const breaks:Array<boolean> = [];
let at = range.EndIndex;
let lineBreak = false;
while (words.length < 2 && at < count) {
  const ch = whole.At(at);
  if (ch === " " || ch === "\t" || ch === "\v" || ch === "\f") {
    at++;
    continue;
  }
  if (LineTerminator.IsLineTerminator(ch)) {
    lineBreak = true;
    at++;
    continue;
  }
  if (ch === "/" && at + 1 < count) {
    const next = whole.At(at + 1);
    if (next === "/") {
      at += 2;
      while (at < count && !LineTerminator.IsLineTerminator(whole.At(at))) {
        at++;
      }
      continue;
    }
    if (next === "*") {
      at += 2;
      while (at + 1 < count && !(whole.At(at) === "*" && whole.At(at + 1) === "/")) {
        at++;
      }
      at += 2;
      continue;
    }
  }
  if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === "$") {
    let word = "";
    while (at < count) {
      const part = whole.At(at);
      if ((part >= "a" && part <= "z") || (part >= "A" && part <= "Z")
        || (part >= "0" && part <= "9") || part === "_" || part === "$") {
        word += part;
        at++;
        continue;
      }
      break;
    }
    words.push(word);
    breaks.push(lineBreak);
    lineBreak = false;
    continue;
  }
  break;
}
if (words.length < 1) {
  return 0;
}
if (secondText === "default") {
  if (words[0] !== "function" || breaks[0]) {
    return 0;
  }
  return ExportInnerStartPossibleShape.KindFunction;
}
if (!(words[0] === "const" || words[0] === "let" || words[0] === "var") || breaks[0]) {
  return 0;
}
// `declare const enum E {}` 归 enum 声明族（与 D3 的 `DeclareVariablePossibleShape.Owns` 同一判据）。
if (words[0] === "const" && words.length > 1 && words[1] === "enum" && !breaks[1]) {
  return 0;
}
return ExportInnerStartPossibleShape.KindVariable;
```

## static method TryDelegate:(host:Token, start:int, secondAt:int, tokenIndex:int, context:SyntaxContext)=>Token | null

命中时挂占位壳并返回它；未命中返回 `null`（调用方逐字回既有声明壳）。

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
if (secondAt < 0 || secondAt > tokenIndex || secondAt >= host.Data.length) {
  return null;
}
if (ExportInnerDelegate.ProbeKind(host.Data, secondAt) === 0) {
  return null;
}
if (!(host.Data[secondAt] instanceof Common)) {
  return null;
}
const shape = new ExportInnerDeclarationShape(host.Template);
shape.CatalogGuide = new CatalogGuide([new ExportInnerStartPossibleShape()], null);
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
const lastPrefix = secondAt > tokenIndex ? tokenIndex : secondAt;
const consumed:Array<Token> = host.Data.slice(start, lastPrefix + 1);
host.Data.splice(start, consumed.length);
let replayStart = -1;
let replayEnd = -1;
if (lastPrefix < tokenIndex) {
  const leftover:Array<Token> = host.Data.slice(start, start + (tokenIndex - lastPrefix));
  for (const item of leftover) {
    if (item.IsTriviaToken) {
      continue;
    }
    if (replayStart < 0 && item.SourceRange.Start >= 0) {
      replayStart = item.SourceRange.StartIndex;
    }
    if (item.SourceRange.End >= 0) {
      replayEnd = item.SourceRange.EndIndex;
    }
  }
  host.Data.splice(start, leftover.length);
  // 被卸下来的单元不进树，但要把 `Parent` 改到本壳：闭合括号那一拍会 `Quit()`，它无条件清
  // `Parent.MountedUnit`；残留的 Parent 还指着根时会把刚挂上的壳摘掉（B5 同一处）。
  for (const item of leftover) {
    item.Parent = shape;
  }
}
for (const item of consumed) {
  shape.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shape.SignIn(begin);
}
shape.Pos = pos;
host.Data.splice(start, 0, shape);
shape.Parent = host;
host.MountedUnit = shape;
ExportInnerDelegate.MountCount += 1;
shape.ComputePossibleShapes(context, PossibleSource.Close);
if (replayStart >= 0 && replayEnd > replayStart) {
  context.Messages.push(ReloadMessage.FromRange(host, replayStart, replayEnd));
}
return shape;
```

## static method BuildInner:(host:Token, tokenIndex:int, context:SyntaxContext)=>Token

占位壳的建造点：按 `OwnsExportInner` 的族分别换成内层声明，并把占位壳从父单元里顶掉。

```ts
const placeholder = host as ExportInnerDeclarationShape;
const units = placeholder.Data;
const headAt = ItemUtil.NextCode(units, 0);
if (headAt >= units.length) {
  throw new Error("export 内层声明未支持：缺少 export 关键字");
}
const secondAt = ItemUtil.NextCode(units, headAt + 1);
if (secondAt >= units.length) {
  throw new Error("export 内层声明未支持：缺少 declare/default");
}
const thirdAt = ItemUtil.NextCode(units, secondAt + 1);
if (thirdAt >= units.length) {
  throw new Error("export 内层声明未支持：缺少内层声明关键字");
}
const kind = ExportDeclarationPossibleShape.OwnsExportInner(units, headAt, secondAt, thirdAt);
if (kind === ExportInnerStartPossibleShape.KindVariable) {
  return ExportInnerDelegate.BuildVariable(placeholder, headAt, tokenIndex, context);
}
if (kind === ExportInnerStartPossibleShape.KindFunction) {
  return ExportInnerDelegate.BuildFunction(placeholder, tokenIndex, context);
}
throw new Error("export 内层声明未支持：内层声明族");
```

## private static method BuildVariable:(placeholder:ExportInnerDeclarationShape, exportAt:int, tokenIndex:int, context:SyntaxContext)=>Token

变量族：`export` 单元先摘出来（内层 builder 的 `ItemStart` 必须落在 `declare` 上），三层仍由
`IncrementalVariableStatementBuilder.Build(…, declared=true)` 唯一负责；建完把 `ExportKeywordShape`
插到语句最前、`DeclareKeywordShape.Pos` 对齐 legacy。

```ts
const units = placeholder.Data;
const exportUnit = units[exportAt];
units.splice(exportAt, 1);
const built = IncrementalVariableStatementBuilder.Build(placeholder, tokenIndex - 1, context, true) as VariableStatementShape;
// Pos：语句首（legacy `export declare const x` 的 VariableStatementShape pos=0）；三层自己的
// list / declaration / Identifier Pos 由 builder 按「前一个代码单元」算，不受 export 影响。
built.Pos = placeholder.Pos;
const exportModifier = ExportKeywordShape.FromBasicToken(exportUnit as Common, context);
exportModifier.Pos = placeholder.Pos;
if (exportModifier.SourceRange.End < 0 && exportUnit.SourceRange.End >= 0) {
  exportModifier.SignOut(exportUnit.SourceRange.EndIndex);
}
// legacy `BuildExportStatement`：declare 修饰词挂在 export 之后（`Pos` = export 的 EndIndex）。
if (built.Data.length > 0 && built.Data[0] instanceof DeclareKeywordShape) {
  const declareModifier = built.Data[0] as DeclareKeywordShape;
  declareModifier.Pos = exportUnit.SourceRange.End < 0 ? placeholder.Pos : exportUnit.SourceRange.EndIndex;
}
built.Data.unshift(exportModifier);
exportModifier.Parent = built;
placeholder.Replace(built);
ExportInnerDelegate.MountCount += 1;
return built;
```

## private static method BuildFunction:(placeholder:ExportInnerDeclarationShape, tokenIndex:int, context:SyntaxContext)=>Token

function 族：换成 `FunctionDeclarationShape` 壳（children 先留 `export` / `default` 两个 raw 单元），
收口交给 `ExportInnerFunctionEndPossibleShape`。

```ts
const shell = new FunctionDeclarationShape(placeholder.Template);
shell.CatalogGuide = new CatalogGuide([], new ExportInnerFunctionEndPossibleShape());
const consumed:Array<Token> = placeholder.Data.slice(0, placeholder.Data.length);
for (const item of consumed) {
  shell.Add(item);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shell.SignIn(begin);
}
shell.Pos = placeholder.Pos;
placeholder.Replace(shell);
shell.ComputePossibleShapes(context, PossibleSource.Close);
ExportInnerDelegate.MountCount += 1;
return shell;
```
