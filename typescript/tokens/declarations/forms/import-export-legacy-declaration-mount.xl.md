# dependencies
```xl
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
```

# namespace cangjie

# class ImportExportLegacyDeclarationMount

`import x = …`（import-equals）、`export = …`（export assignment）、`export as namespace …`
三族的**尽早挂壳**入口（WP-B5）。

这三族走的是 `StatementRoute.Legacy`（`DecideDeclaration` 把它们让给各自的根候选），
所以接在各自 `*-possible-shape` 上：`Ready` 判出「本格正好是族判定的那一格」时
`ComputeByIndex` 返回 `Accept`、`BuildByIndex` 调 `TryBuild` 直接把族形状挂到根上，
此后每个单元由形状自己的目录（本文件里的子候选 + 终结候选）建出来。

- 门控：`TryBuild` / `Ready` 第一步都看 `StatementRouteUtil.IsIncrementalShapesEnabled()`；
  开关 false 时 `Ready` 恒 false、`TryBuild` 恒 null ⇒ 三个 possible-shape 逐字走原原子路径（legacy 不变）。
- 形状类名 / 层级 / Pos 与 legacy 的 `FromUnits` 逐项同源（同一批 `IdentifierShape` /
  `QualifiedNameShape` / `ExternalModuleReferenceShape` / `StringLiteralShape`）。
- 未支持形态显式抛 `增量变量形状未支持：…`（C10），不静默退回。

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

# class ImportExportLegacyEndScan

## field Checked:int = 0

## field LastCode:int = -1

# class ImportExportLegacyEndPossibleShape extends PossibleShape

```txt
import x = require("m");
                    ^ 声明在这里结束
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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
return ShapeStates.Reject;
```

## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token

```ts
const unit = host as UnitToken;
let at = tokenIndex;
while (at >= 0 && (host.Data[at].IsTriviaToken || host.Data[at] instanceof EndOfFileTokenShape)) {
  at--;
}
// End 必须取到最后一个**代码**子单元（含 `;`），与 legacy `FromUnits` 的 `last.EndIndex` 同口径；
// 取完再把这些 basic 子单元从 Data 里清掉——legacy 树的族形状下面只有形状子节点，
// 留着 `import` / `=` / `;` 当子节点会把 EOF 树的非 basic 行前缀（├─/└─）也改掉，账本判 divergent。
let end = -1;
if (at >= 0) {
  end = host.Data[at].SourceRange.EndIndex;
}
const kept:Array<Token> = [];
for (const item of host.Data) {
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
unit.Quit();
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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
if (state.HasShape) {
  return ShapeStates.Reject;
}
const last = state.LastCode;
if (last < 0) {
  return ShapeStates.Uncertain;
}
const tail = units[last];
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
  // 实体名 `A.B`：QualifiedNameShape（左 = 点号前的标识符，右 = 点号后的标识符）。
  const dotIndex = ItemUtil.PreviousCode(shape.Data, last - 1);
  if (dotIndex < 0 || !(shape.Data[dotIndex] instanceof Symbol) || !(shape.Data[dotIndex] as Symbol).Is(".")) {
    throw new Error("增量变量形状未支持：declaration import-equals 实体名");
  }
  const leftIndex = ItemUtil.PreviousCode(shape.Data, dotIndex - 1);
  if (leftIndex < 0 || !(shape.Data[leftIndex] instanceof Common)) {
    throw new Error("增量变量形状未支持：declaration import-equals 实体名");
  }
  const left = IdentifierShape.FromBasicToken(shape.Data[leftIndex] as Common, context);
  left.Pos = equalEnd;
  if (left.SourceRange.EndIndex < 0 && shape.Data[leftIndex].SourceRange.EndIndex >= 0) {
    left.SignOut(shape.Data[leftIndex].SourceRange.End);
  }
  const right = IdentifierShape.FromBasicToken(tail as Common, context);
  const dot = shape.Data[dotIndex];
  if (dot.SourceRange.EndIndex >= 0) {
    right.Pos = dot.SourceRange.EndIndex;
  }
  if (right.SourceRange.EndIndex < 0 && tail.SourceRange.EndIndex >= 0) {
    right.SignOut(tail.SourceRange.End);
  }
  const qualified = new QualifiedNameShape(host.Template);
  qualified.Left = left;
  qualified.Right = right;
  qualified.Add(left);
  qualified.Add(right);
  if (left.SourceRange.StartIndex >= 0) {
    qualified.SignIn(left.SourceRange.Start);
  }
  if (right.SourceRange.EndIndex >= 0) {
    qualified.SignOut(right.SourceRange.End);
  }
  qualified.Pos = left.Pos;
  qualified.TryToClose(context);
  reference = qualified;
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
  return previous >= 0 && units[previous] instanceof Symbol && (units[previous] as Symbol).Is(".");
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

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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
  throw new Error("增量变量形状未支持：expression export-assignment");
}
if (tail instanceof EndOfFileTokenShape) {
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
for (let at = last - 1; at >= 0; at--) {
  if (shape.Data[at].IsTriviaToken) {
    continue;
  }
  const end = shape.Data[at].SourceRange.EndIndex;
  equalEnd = end >= 0 ? end : 0;
  break;
}
const unit = shape.Data[last];
const expression = IdentifierShape.FromBasicToken(unit as Common, context);
expression.Pos = equalEnd;
if (expression.SourceRange.EndIndex < 0 && unit.SourceRange.EndIndex >= 0) {
  expression.SignOut(unit.SourceRange.End);
}
const assignment = shape as ExportAssignmentShape;
assignment.Expression = expression;
shape.Add(expression);
return expression;
```

## method IsBuildable:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>bool

```ts
// 与 `ComputeByIndex` 同一判据：只有「最后一个代码单元是 Common」才可建（否则 Uncertain 会被误建）。
let last = tokenIndex;
if (last >= units.length) {
  last = units.length - 1;
}
while (last >= 0 && units[last].IsTriviaToken) {
  last--;
}
return last >= 0 && units[last] instanceof Common;
```

# class NamespaceExportNameScan

## field Checked:int = 0

## field HasShape:bool = false

## field LastCode:int = -1

# class NamespaceExportNamePossibleShape extends PossibleShape

```txt
export as namespace X;
```

## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates

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
