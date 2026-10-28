# dependencies
```xl
import { PossibleSource } from "../../../../core/syntax/possible-source.xl.md"
import { CatalogGuide } from "../../../../core/syntax/catalog-guide.xl.md"
import { Bracket } from "../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../../core/syntax/possible-shape.xl.md"
import { PossibleShapeCache } from "../../../../core/syntax/possible-shape-cache.xl.md"
import { ShapeStates } from "../../../../core/syntax/shape-states.xl.md"
import { ShapeToken } from "../../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../../core/syntax/token.xl.md"
import { UnitToken } from "../../../../core/syntax/unit-token.xl.md"
import { EndOfFileTokenShape } from "../../trivia/end-of-file-token-shape.xl.md"
import { ItemUtil } from "../../item-util.xl.md"
import { IdentifierShape } from "../../names/identifier-shape.xl.md"
import { StringLiteralShape } from "../../literals/string-literal-shape.xl.md"
import { QualifiedNameShape } from "../../types/qualified-name-shape.xl.md"
import { ExternalModuleReferenceShape } from "../external-module-reference-shape.xl.md"
import { ImportEqualsDeclarationShape } from "../import-equals-declaration-shape.xl.md"
import { ExportAssignmentShape } from "../export-assignment-shape.xl.md"
import { NamespaceExportDeclarationShape } from "../namespace-export-declaration-shape.xl.md"
import { StatementRouteUtil } from "../../statements/statement-route-util.xl.md"
import { DeclarationAsiBoundary } from "./declaration-asi-boundary.xl.md"
import { ExpressionBuilder } from "../../expressions/expression-builder.xl.md"
```

# namespace cangjie

# class ImportExportLegacyDeclarationMount

```txt
import x = require("m");     ← `=` 那一格挂 ImportEqualsDeclarationShape
import x = A.B;              ← 同上
export = x;                  ← `=` 那一格挂 ExportAssignmentShape
export as namespace X;       ← `namespace` 那一格挂 NamespaceExportDeclarationShape
```

## static field KindImportEquals:int = 1

## static field KindExportAssignment:int = 2

## static field KindNamespaceExport:int = 3

## static field MountCount:int = 0

## static method CodeUnits:(units:Array<Token>, start:int, tokenIndex:int)=>Array<int>

```ts
const codeAt:Array<number> = [];
if (start < 0) {
  return codeAt;
}
for (let at = start; at <= tokenIndex && at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    codeAt.push(at);
  }
}
return codeAt;
```

## static method Ready:(kind:int, units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return false;
}
if (tokenIndex < 0 || tokenIndex >= units.length || units[tokenIndex].IsTriviaToken) {
  return false;
}
const start = ItemUtil.ItemStartCached(units, cache);
const codeAt = ImportExportLegacyDeclarationMount.CodeUnits(units, start, tokenIndex);
if (kind === ImportExportLegacyDeclarationMount.KindImportEquals) {
  // import [type] <name> =   （也接受 export import … 的前缀形）
  let at = 0;
  if (codeAt.length === 0) {
    return false;
  }
  const head = units[codeAt[0]];
  if (head instanceof Common && (head as Common).Is("export")) {
    at = 1;
  }
  if (at >= codeAt.length) {
    return false;
  }
  const keyword = units[codeAt[at]];
  if (!(keyword instanceof Common) || !(keyword as Common).Is("import")) {
    return false;
  }
  at++;
  if (at < codeAt.length && units[codeAt[at]] instanceof Common
    && (units[codeAt[at]] as Common).Is("type")) {
    at++;
  }
  if (at + 1 >= codeAt.length) {
    return false;
  }
  if (!(units[codeAt[at]] instanceof Common)) {
    return false;
  }
  at++;
  const equal = units[codeAt[at]];
  if (!(equal instanceof Symbol) || !(equal as Symbol).Is("=")) {
    return false;
  }
  return codeAt.length === at + 1;
}
if (kind === ImportExportLegacyDeclarationMount.KindExportAssignment) {
  if (codeAt.length !== 2) {
    return false;
  }
  const head = units[codeAt[0]];
  const equal = units[codeAt[1]];
  return head instanceof Common && (head as Common).Is("export")
    && equal instanceof Symbol && (equal as Symbol).Is("=");
}
if (kind === ImportExportLegacyDeclarationMount.KindNamespaceExport) {
  if (codeAt.length !== 3) {
    return false;
  }
  const head = units[codeAt[0]];
  const asUnit = units[codeAt[1]];
  const namespaceUnit = units[codeAt[2]];
  return head instanceof Common && (head as Common).Is("export")
    && asUnit instanceof Common && (asUnit as Common).Is("as")
    && namespaceUnit instanceof Common && (namespaceUnit as Common).Is("namespace");
}
return false;
```

## static method TryBuild:(kind:int, host:Token, tokenIndex:int, context:SyntaxContext)=>Token | null

```ts
if (!StatementRouteUtil.IsIncrementalShapesEnabled()) {
  return null;
}
const start = ItemUtil.ItemStart(host.Data);
if (start < 0 || start > tokenIndex) {
  return null;
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
const consumed:Array<Token> = host.Data.slice(start, tokenIndex + 1);
host.Data.splice(start, consumed.length);
let shape:ShapeToken;
if (kind === ImportExportLegacyDeclarationMount.KindImportEquals) {
  shape = new ImportEqualsDeclarationShape(host.Template);
} else if (kind === ImportExportLegacyDeclarationMount.KindExportAssignment) {
  shape = new ExportAssignmentShape(host.Template);
} else {
  shape = new NamespaceExportDeclarationShape(host.Template);
}
for (const item of consumed) {
  shape.Add(item);
}
if (kind === ImportExportLegacyDeclarationMount.KindImportEquals) {
  // 单元已进 Data：把本地名那一格就地换成 IdentifierShape（`FromUnits` 的同一形状、同一 Pos）。
  ImportExportLegacyDeclarationMount.FillImportEquals(shape as ImportEqualsDeclarationShape, consumed, context);
}
const begin = consumed[0].SourceRange.Start;
if (begin >= 0) {
  shape.SignIn(begin);
}
shape.Pos = pos;
shape.CatalogGuide = new CatalogGuide(
  ImportExportLegacyDeclarationMount.ChildCandidates(kind),
  new ImportExportLegacyEndPossibleShape());
host.Data.splice(start, 0, shape);
shape.Parent = host;
host.MountedUnit = shape;
ImportExportLegacyDeclarationMount.MountCount += 1;
return shape;
```

## private static method FillImportEquals:(shape:ImportEqualsDeclarationShape, consumed:Array<Token>, context:SyntaxContext)=>void

```ts
// 本地名已经是闭合单元：直接建成 IdentifierShape 替进 Data（Pos 与 `FromUnits` 同源：
// 有 `type` 修饰取 `type` 的 EndIndex，否则取 `import` 的 EndIndex）。
const code:Array<Token> = [];
for (const item of consumed) {
  if (!item.IsTriviaToken) {
    code.push(item);
  }
}
let index = 0;
if (code.length > 0 && code[0] instanceof Common && (code[0] as Common).Is("export")) {
  index = 1;
}
const keyword = code[index];
index++;
let typeUnit:Token | null = null;
if (index < code.length && code[index] instanceof Common && (code[index] as Common).Is("type")) {
  typeUnit = code[index];
  shape.IsTypeOnly = true;
  index++;
}
if (index >= code.length) {
  throw new Error("增量变量形状未支持：declaration import-equals 名字");
}
const nameUnit = code[index];
if (!(nameUnit instanceof Common)) {
  throw new Error("增量变量形状未支持：declaration import-equals 名字");
}
const name = IdentifierShape.FromBasicToken(nameUnit as Common, context);
const nameSource = typeUnit !== null ? typeUnit : keyword;
if (nameSource.SourceRange.EndIndex >= 0) {
  name.Pos = nameSource.SourceRange.EndIndex;
}
if (name.SourceRange.EndIndex < 0 && nameUnit.SourceRange.EndIndex >= 0) {
  name.SignOut(nameUnit.SourceRange.End);
}
shape.LocalName = name;
const at = shape.Data.indexOf(nameUnit);
if (at >= 0) {
  name.Parent = shape;
  shape.Data.splice(at, 1, name);
} else {
  shape.Add(name);
}
```

## private static method ChildCandidates:(kind:int)=>Array<PossibleShape>

```ts
if (kind === ImportExportLegacyDeclarationMount.KindImportEquals) {
  return [new ImportEqualsReferencePossibleShape()];
}
if (kind === ImportExportLegacyDeclarationMount.KindExportAssignment) {
  return [new ExportAssignmentValuePossibleShape()];
}
return [new NamespaceExportNamePossibleShape()];
```

## static method IsOpenTail:(unit:Token)=>bool

```ts
if (unit instanceof Symbol) {
  const symbol = unit as Symbol;
  return symbol.Is("=") || symbol.Is(".") || symbol.Is(",") || symbol.Is(":")
    || symbol.Is("+") || symbol.Is("-") || symbol.Is("*") || symbol.Is("/");
}
if (unit instanceof Common) {
  const word = (unit as Common).TempToString();
  return ImportExportLegacyDeclarationMount.OpenTailWords.includes(word);
}
return false;
```

## static field OpenTailWords:Array<string> = ["import", "export", "as", "namespace", "type", "from", "require", "default"]

```ts
["import", "export", "as", "namespace", "type", "from", "require", "default"]
```

# class ImportExportLegacyEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ImportExportLegacyEndPossibleShape extends PossibleShape

```txt
import x = require("m");
                    ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportExportLegacyEndScan>(name);
if (state === null) {
  state = new ImportExportLegacyEndScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
}
state.Checked = tokenIndex + 1;
const trimmed = state.LastCode;
if (trimmed < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[trimmed];
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  return ShapeStates.Accept;
}
if (units[tokenIndex] instanceof EndOfFileTokenShape) {
  return ShapeStates.Accept;
}
// [W5:LEGACY-ASI] 末尾没有 `;`（真实 `.d.ts` 与用例语料里很常见）：只要「本格之前的最后一条
// 代码单元」之后跨行起了一条**不续接**的新语句，就在这一格收口。少了这一条，
// `import fs = require("fs")` ⏎ `import A = B.C` 会把下一行整段吞进同一条声明
//（`im-import-equals`、`undici-types/mock-agent`），`export as namespace A` ⏎ `export = A` 同理
//（`am-export-equals-namespace`）。字符前缀与 `DeclarationAsiBoundary.CanCloseAtLineBreak`
// 同一份（`StartsNewStatementLine`），不新写 ASI 词法。
// 判据取「不含本格」的上一格：本格（新到的单元）正是下一条语句的开头，本声明在它之前结束。
let previous = -1;
for (let at = tokenIndex - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    previous = at;
    break;
  }
}
if (previous >= 0 && DeclarationAsiBoundary.StartsNewStatementLine(units[previous])
  && !ImportExportLegacyDeclarationMount.IsOpenTail(units[previous])) {
  return ShapeStates.Accept;
}
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
const data = host.Data;
// [W5:LEGACY-ASI] `Accept` 的那一格若不是 `;` 也不是 EOF，它就是**下一条语句的第一个单元**：
// 本声明在它之前收口，边界单元（连同其后的 trivia）交回父单元重放——
// 与 `IncrementalVariableDeclarationListBuilder.CloseAtAsiBoundary` 同一手法
//（先挂回父单元 `Data`，再逐格驱动父目录，让下一条语句在自己的那一格建树）。
let boundary = -1;
if (!(data[tokenIndex] instanceof EndOfFileTokenShape)
  && !(data[tokenIndex] instanceof Symbol && (data[tokenIndex] as Symbol).Is(";"))) {
  boundary = tokenIndex;
}
let at = boundary >= 0 ? boundary - 1 : tokenIndex;
while (at >= 0 && (data[at].IsTriviaToken || data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
// End 必须取到最后一个**代码**子单元（含 `;`），与 legacy `FromUnits` 的 `last.EndIndex` 同口径；
// 取完再把这些 basic 子单元从 Data 里清掉——legacy 树的族形状下面只有形状子节点，
// 留着 `import` / `=` / `;` 当子节点会把 EOF 树的非 basic 行前缀（├─/└─）也改掉，账本判 divergent。
let end = -1;
if (at >= 0) {
  end = data[at].SourceRange.EndIndex;
}
const leftover:Array<Token> = boundary >= 0 ? data.splice(boundary) : [];
const kept:Array<Token> = [];
for (const item of data) {
  if (item.IsBasicToken || item.IsTriviaToken) {
    continue;
  }
  kept.push(item);
}
host.Data = kept;
if (end >= 0) {
  unit.SignOut(end);
}
unit.TryToClose(context);
const parent = unit.Quit();
if (parent !== null && leftover.length > 0) {
  const hostIndex = parent.Data.indexOf(unit);
  if (hostIndex >= 0) {
    for (let index = 0; index < leftover.length; index++) {
      leftover[index].Parent = parent;
      parent.Data.splice(hostIndex + 1 + index, 0, leftover[index]);
    }
    parent.MountedUnit = null;
    DeclarationAsiBoundary.ReplayLeftover(parent, leftover, context);
  }
}
return host;
```

# class ImportEqualsReferenceScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class ImportEqualsReferencePossibleShape extends PossibleShape

```txt
import x = require("m");
import x = A.B;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ImportEqualsReferenceScan>(name);
if (state === null) {
  state = new ImportEqualsReferenceScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
  if (units[at] instanceof ExternalModuleReferenceShape || units[at] instanceof QualifiedNameShape) {
    state.HasShape = true;
  }
}
state.Checked = tokenIndex + 1;
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
// [W5:IMPORT-EQUALS-CHAIN] 链还在长（`.`）时不判死：`A.B.C` 会在 `B` 那一格先建出半截
// `QualifiedName(A,B)`，随后在 `C` 那一格整条重建（`BuildByIndex` 会先摘掉旧的半截）。
const previousAt = ItemUtil.PreviousCode(units, last - 1);
const continuesChain = (tail instanceof Symbol && (tail as Symbol).Is("."))
  || (previousAt >= 0 && units[previousAt] instanceof Symbol && (units[previousAt] as Symbol).Is("."));
if (state.HasShape && !continuesChain) {
  return ShapeStates.Reject;
}
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "(") {
  const previous = ItemUtil.PreviousCode(units, last - 1);
  if (previous >= 0 && units[previous] instanceof Common && (units[previous] as Common).Is("require")) {
    return ShapeStates.Accept;
  }
  throw new Error("增量变量形状未支持：declaration import-equals 括号");
}
if (tail instanceof Common) {
  const previous = ItemUtil.PreviousCode(units, last - 1);
  if (previous >= 0 && units[previous] instanceof Symbol && (units[previous] as Symbol).Is(".")) {
    return ShapeStates.Accept;
  }
  return ShapeStates.Uncertain;
}
if (tail instanceof Symbol && (tail as Symbol).Is(".")) {
  // `A` 之后、`B` 之前：引用还没长完。
  return ShapeStates.Uncertain;
}
if (tail instanceof EndOfFileTokenShape) {
  throw new Error("增量变量形状未支持：declaration import-equals 引用");
}
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  throw new Error("增量变量形状未支持：declaration import-equals 引用");
}
return ShapeStates.Uncertain;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shape = host as ShapeToken;
let last = shape.Data.length - 1;
while (last >= 0 && shape.Data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return host;
}
const tail = shape.Data[last];
// 引用的 Pos 是 `=` 的 EndIndex（`FromUnits` 的 `referencePos` 同源）。不能取「最后一个代码单元前面那一格」：
// `require` 之前是 `require` 自己，`A.B` 的 `B` 之前是 `.`，都不是等号。
let equalEnd = 0;
for (let at = shape.Data.length - 1; at >= 0; at--) {
  const item = shape.Data[at];
  if (item instanceof Symbol && (item as Symbol).Is("=")) {
    const end = item.SourceRange.EndIndex;
    equalEnd = end >= 0 ? end : 0;
    break;
  }
}
let reference:Token;
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "(") {
  const previous = shape.Data[last - 1];
  let requireUnit:Token | null = null;
  for (let at = last - 1; at >= 0; at--) {
    if (shape.Data[at].IsTriviaToken) {
      continue;
    }
    requireUnit = shape.Data[at];
    break;
  }
  if (requireUnit === null || !(requireUnit instanceof Common) || !(requireUnit as Common).Is("require")) {
    throw new Error("增量变量形状未支持：declaration import-equals 引用");
  }
  const inner = tail as Bracket;
  let stringUnit:Token | null = null;
  for (const child of inner.Data) {
    if (!child.IsTriviaToken) {
      stringUnit = child;
      break;
    }
  }
  if (stringUnit === null || !(stringUnit instanceof String)) {
    throw new Error("增量变量形状未支持：declaration import-equals 字符串");
  }
  const literal = StringLiteralShape.FromBasicToken(stringUnit as String, context);
  if (inner.SourceRange.StartIndex >= 0) {
    literal.Pos = inner.SourceRange.StartIndex + 1;
  }
  if (literal.SourceRange.EndIndex < 0 && stringUnit.SourceRange.EndIndex >= 0) {
    literal.SignOut(stringUnit.SourceRange.End);
  }
  const external = new ExternalModuleReferenceShape(host.Template);
  external.Add(literal);
  if (requireUnit.SourceRange.StartIndex >= 0) {
    external.SignIn(requireUnit.SourceRange.Start);
  }
  if (inner.SourceRange.EndIndex >= 0) {
    external.SignOut(inner.SourceRange.End);
  }
  external.Pos = equalEnd;
  external.TryToClose(context);
  reference = external;
} else {
  // 实体名 `A` / `A.B` / `A.B.C`：QualifiedNameShape 左结合嵌套，children 顺序 [left, right]
  //（与 `ImportEqualsDeclarationShape.FromUnits` 同一形状、同一 Pos 口径）。
  // [W5:IMPORT-EQUALS-CHAIN] 整条链在这里**一次**建出：`IsBuildable` 只在「最后一段」放行。
  // 否则 `B.C.D` 会在 `C` 处先建出 `B.C`，随后 `HasShape` 把本候选判死，`.D` 成为残余单元
  //（`mod-import-equals-deep.ts`：少 1 个 QualifiedName + 1 个 Identifier）。
  let equalIndex = -1;
  for (let at = 0; at < shape.Data.length; at++) {
    const item = shape.Data[at];
    if (item instanceof Symbol && (item as Symbol).Is("=")) {
      equalIndex = at;
    }
  }
  if (equalIndex < 0) {
    throw new Error("增量变量形状未支持：declaration import-equals 实体名");
  }
  // 中间段（`A.B` 那一格）已经建过一次的半截引用先摘掉：整条链按原始 basic 单元重建，
  // 否则旧的 `QualifiedName(A,B)` 会和新链一起留在 `Data` 里。
  // **先取单元、再摘旧的**：splice 会让下标整体前移，`last` 与 `segments` 都会失效。
  const codeUnits:Array<Token> = [];
  for (let at = equalIndex + 1; at <= last; at++) {
    const item = shape.Data[at];
    if (item === undefined || item.IsTriviaToken || !item.IsBasicToken) {
      continue;
    }
    codeUnits.push(item);
  }
  const stale = (shape as ImportEqualsDeclarationShape).Reference;
  if (stale !== null) {
    const staleAt = shape.Data.indexOf(stale);
    if (staleAt >= 0) {
      shape.Data.splice(staleAt, 1);
    }
  }
  if (codeUnits.length < 1 || codeUnits.length % 2 === 0) {
    throw new Error("增量变量形状未支持：declaration import-equals 实体名");
  }
  let current:ShapeToken | null = null;
  for (let step = 0; step < codeUnits.length; step += 2) {
    if (step > 0) {
      const dot = codeUnits[step - 1];
      if (!(dot instanceof Symbol) || !(dot as Symbol).Is(".")) {
        throw new Error("增量变量形状未支持：declaration import-equals 实体名");
      }
    }
    const nameUnit = codeUnits[step];
    if (!(nameUnit instanceof Common)) {
      throw new Error("增量变量形状未支持：declaration import-equals 实体名");
    }
    const identifier = IdentifierShape.FromBasicToken(nameUnit as Common, context);
    if (step === 0) {
      identifier.Pos = equalEnd;
    } else {
      const dot = codeUnits[step - 1];
      if (dot.SourceRange.EndIndex >= 0) {
        identifier.Pos = dot.SourceRange.EndIndex;
      }
    }
    if (identifier.SourceRange.EndIndex < 0 && nameUnit.SourceRange.EndIndex >= 0) {
      identifier.SignOut(nameUnit.SourceRange.End);
    }
    if (current === null) {
      current = identifier;
      continue;
    }
    const qualified = new QualifiedNameShape(host.Template);
    qualified.Left = current;
    qualified.Right = identifier;
    qualified.Add(current);
    qualified.Add(identifier);
    if (current.SourceRange.StartIndex >= 0) {
      qualified.SignIn(current.SourceRange.Start);
    }
    if (identifier.SourceRange.EndIndex >= 0) {
      qualified.SignOut(identifier.SourceRange.End);
    }
    qualified.Pos = current.Pos;
    qualified.TryToClose(context);
    current = qualified;
  }
  if (current === null) {
    throw new Error("增量变量形状未支持：declaration import-equals 实体名");
  }
  reference = current;
}
// 把引用（连同它左侧被吃进形状的 `=` 之前的单元）挂到形状上：形状的 Data 只保留
// 「修饰词残留 + 已建形状」，与 legacy `FromUnits` 的 Data 同形。
const declaration = shape as ImportEqualsDeclarationShape;
declaration.Reference = reference;
shape.Add(reference);
return reference;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 目录向导只在「恰好剩一个候选」时才建；本候选在「引用还没长完」的格子上必须 IsBuildable=false，
// 否则 `Uncertain` 也会被当成可建（基类默认 true）——`require` 那一格就会被误建。
let last = tokenIndex;
if (last >= units.length) {
  last = units.length - 1;
}
while (last >= 0 && units[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return false;
}
const tail = units[last];
if (tail instanceof Bracket && (tail as Bracket).StartBracketChar === "(") {
  const previous = ItemUtil.PreviousCode(units, last - 1);
  return previous >= 0 && units[previous] instanceof Common && (units[previous] as Common).Is("require");
}
if (tail instanceof Common) {
  const previous = ItemUtil.PreviousCode(units, last - 1);
  if (previous < 0 || !(units[previous] instanceof Symbol) || !(units[previous] as Symbol).Is(".")) {
    return false;
  }
  // [W5:IMPORT-EQUALS-CHAIN] 点号后面还有下一段（`.D`）就继续等：整条 `A.B.C` 在最后一段一次建出，
  // 否则会在中间段先建出 `A.B`、随后 `HasShape` 判死，尾段丢失。
  for (let at = last + 1; at < units.length; at++) {
    if (units[at].IsTriviaToken) {
      continue;
    }
    return !(units[at] instanceof Symbol && (units[at] as Symbol).Is("."));
  }
  return true;
}
return false;
```

# class ExportAssignmentValueScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class ExportAssignmentValuePossibleShape extends PossibleShape

```txt
export = x;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<ExportAssignmentValueScan>(name);
if (state === null) {
  state = new ExportAssignmentValueScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
  if (units[at] instanceof IdentifierShape) {
    state.HasShape = true;
  }
}
state.Checked = tokenIndex + 1;
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
const previousAt = ItemUtil.PreviousCode(units, last - 1);
const continuesChain = (tail instanceof Symbol && (tail as Symbol).Is("."))
  || (previousAt >= 0 && units[previousAt] instanceof Symbol && (units[previousAt] as Symbol).Is("."));
// [W5:EXPORT-EQUALS-VALUE] 链还在长（`.`）时不判死：`export = B.C` 会在 `B` 建出半截 `Identifier`，
// 再在 `C` 那一格整条重建（`BuildByIndex` 会先摘掉旧的半截）。
if (state.HasShape && !continuesChain) {
  return ShapeStates.Reject;
}
if (tail instanceof Common) {
  return ShapeStates.Accept;
}
// [W5:EXPORT-EQUALS-VALUE] `export = B.C`：点号是**续接**，不是「不支持的形状」——
// 整条表达式交给 `ExpressionBuilder`（与 `ExportAssignmentShape.FromUnits` 同一实现），
// 于是右操作数是 `PropertyAccessExpression` 而不是半截 `Identifier`。
if (tail instanceof Symbol && (tail as Symbol).Is(".")) {
  return ShapeStates.Uncertain;
}
// 右操作数已经建出（`Data` 里有非 basic 形状，例如 `PropertyAccessExpression`）时，
// `;` / EOF 不由本候选处理——交回终结候选；只有「什么都没建出来」才是真缺口。
let hasBuiltExpression = false;
for (const item of units) {
  if (!item.IsBasicToken && !item.IsTriviaToken) {
    hasBuiltExpression = true;
    break;
  }
}
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  if (hasBuiltExpression) {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：expression export-assignment");
}
if (tail instanceof EndOfFileTokenShape) {
  if (hasBuiltExpression) {
    return ShapeStates.Reject;
  }
  throw new Error("增量变量形状未支持：expression export-assignment");
}
throw new Error("增量变量形状未支持：expression export-assignment");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shape = host as ShapeToken;
let last = shape.Data.length - 1;
while (last >= 0 && shape.Data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return host;
}
let equalEnd = 0;
let equalIndex = -1;
for (let at = 0; at < shape.Data.length; at++) {
  const item = shape.Data[at];
  if (item instanceof Symbol && (item as Symbol).Is("=")) {
    equalIndex = at;
    const end = item.SourceRange.EndIndex;
    equalEnd = end >= 0 ? end : 0;
  }
}
// [W5:EXPORT-EQUALS-VALUE] 右操作数整条交给 `ExpressionBuilder`（legacy 同一实现）：
// `export = B.C` 因此得到 `PropertyAccessExpression(B, C)`，而不是只有 `B` 的 `Identifier`
//（`mod-export-equals-qualified.ts`：少 1 个 PropertyAccessExpression + 1 个 Identifier）。
if (equalIndex < 0) {
  throw new Error("增量变量形状未支持：expression export-assignment");
}
// 中间段（`B` 那一格）已经建过一次的半截表达式先摘掉：整条右操作数按原始 basic 单元重建，
// 否则旧的 `Identifier(B)` 会和新链一起留在 `Data` 里。**先取单元、再摘旧的**（splice 会让下标前移）。
const assignment = shape as ExportAssignmentShape;
const expressionUnits:Array<Token> = [];
for (let at = equalIndex + 1; at <= last; at++) {
  const item = shape.Data[at];
  if (item === undefined || item.IsTriviaToken || !item.IsBasicToken) {
    continue;
  }
  expressionUnits.push(item);
}
if (assignment.Expression !== null) {
  const staleAt = shape.Data.indexOf(assignment.Expression);
  if (staleAt >= 0) {
    shape.Data.splice(staleAt, 1);
  }
}
if (expressionUnits.length < 1) {
  throw new Error("增量变量形状未支持：expression export-assignment");
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(expressionUnits, equalEnd);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：expression export-assignment");
}
assignment.Expression = expression;
shape.Add(expression);
return expression;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 与 `ComputeByIndex` 同一判据：只有「最后一个代码单元是 Common」才可建（否则 Uncertain 会被误建）。
// [W5:EXPORT-EQUALS-VALUE] 后面还跟着 `.` 时继续等：整条 `B.C` 在最后一段一次建出。
let last = tokenIndex;
if (last >= units.length) {
  last = units.length - 1;
}
while (last >= 0 && units[last].IsTriviaToken) {
  last--;
}
if (last < 0 || !(units[last] instanceof Common)) {
  return false;
}
for (let at = last + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  return !(units[at] instanceof Symbol && (units[at] as Symbol).Is("."));
}
return true;
```

# class NamespaceExportNameScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class NamespaceExportNamePossibleShape extends PossibleShape

```txt
export as namespace X;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache, source:PossibleSource)=>ShapeStates

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return ShapeStates.Uncertain;
}
const name = this.Slot();
let state = cache.GetState<NamespaceExportNameScan>(name);
if (state === null) {
  state = new NamespaceExportNameScan();
  cache.SetState(name, state);
}
if (state.Checked > tokenIndex + 1) {
  state.Checked = 0;
  state.HasShape = false;
  state.LastCode = -1;
}
for (let at = state.Checked; at <= tokenIndex; at++) {
  if (!units[at].IsTriviaToken) {
    state.LastCode = at;
  }
  if (units[at] instanceof IdentifierShape) {
    state.HasShape = true;
  }
}
state.Checked = tokenIndex + 1;
if (state.HasShape) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
if (tail instanceof Common) {
  return ShapeStates.Accept;
}
if (tail instanceof Symbol && (tail as Symbol).Is(";")) {
  throw new Error("增量变量形状未支持：declaration export-as-namespace 名字");
}
throw new Error("增量变量形状未支持：declaration export-as-namespace 名字");
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const shape = host as ShapeToken;
let last = shape.Data.length - 1;
while (last >= 0 && shape.Data[last].IsTriviaToken) {
  last--;
}
if (last < 0) {
  return host;
}
let namespaceEnd = 0;
for (let at = last - 1; at >= 0; at--) {
  if (shape.Data[at].IsTriviaToken) {
    continue;
  }
  const end = shape.Data[at].SourceRange.EndIndex;
  namespaceEnd = end >= 0 ? end : 0;
  break;
}
const unit = shape.Data[last];
const exportName = IdentifierShape.FromBasicToken(unit as Common, context);
exportName.Pos = namespaceEnd;
if (exportName.SourceRange.EndIndex < 0 && unit.SourceRange.EndIndex >= 0) {
  exportName.SignOut(unit.SourceRange.End);
}
const declaration = shape as NamespaceExportDeclarationShape;
declaration.ExportName = exportName;
shape.Add(exportName);
return exportName;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 与 `ComputeByIndex` 同一判据：只有「最后一个代码单元是 Common」才可建。
let last = tokenIndex;
if (last >= units.length) {
  last = units.length - 1;
}
while (last >= 0 && units[last].IsTriviaToken) {
  last--;
}
return last >= 0 && units[last] instanceof Common;
```
