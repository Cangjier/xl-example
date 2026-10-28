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

```txt
export declare const x: number;          ← 内层是 `declare const` 变量语句
export default function f<T>(a: T): T { return a; }   ← 内层是 `default function` 声明
```

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

# class ExportInnerDeclarationShape extends ShapeToken

## constructor:(template:Template)=>void

```ts
super(template);
```

# class ExportInnerStartPossibleShape extends PossibleShape

## static field KindVariable:int = 1

## static field KindFunction:int = 2

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
// **`allowAnonymous` 必须是 true**：本委托只服务 `export default function …`（`ProbeKind` 的
// `KindFunction` 只在 `default` + 同行 `function` 时给出），而 TS 的 `export default function () {}`
// 是**没有名字**的 FunctionDeclaration（修饰词之后直接是参数表，无名字 child）。
// 传 false 会让 `FromUnits` 抛「函数声明的名字不是标识符」⇒ 整文件 fallback
// （`mod-export-default-function-anon.ts` 实测）。具名形 `export default function f() {}` 不受影响：
// 名字是 `Common` 时 `paramIndex` 照常前进一格，与放宽前逐字同源。
const built = FunctionDeclarationShape.FromUnits(shell, functionAt, lastCode, context, false, true, shell.Pos);
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

## static field MountCount:int = 0

## static method InnerStart:(units:Array<Token>)=>int

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
