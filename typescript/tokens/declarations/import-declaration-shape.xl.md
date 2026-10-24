# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ItemComputeStates } from "../../../core/syntax/item-compute-states.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { ImportClauseUtil } from "./import-clause-util.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
```

# namespace cangjie

# class ImportDeclarationShape extends ShapeToken

```txt
import a from "m";
import { a, b as c } from "m";
import * as ns from "m";
import "m";
import type { T } from "m";
import a, { b } from "m";
import a from "m" with { type: "json" };
```

## field Modifiers:Array<ExportKeywordShape | DeclareKeywordShape> = []

## field ImportClause:ImportClauseShape | null = null

## field ModuleSpecifier:StringLiteralShape | null = null

## field AssertClause:ImportAttributesShape | null = null

## field Attributes:ImportAttributesShape | null = null

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
```

## method TryToClose:(context:SyntaxContext)=>CloseStates

关闭前补 End：挂载壳的 `Data` 里还留着尾随 trivia（空白 / 换行 / 行注释 / 块注释），
而 EOF 收尾有两条路径都会把 `End` 撑到 trivia 末尾：

- `ShapeToken.TryToClose` 的兜底取的是**最后一个 `Data` 单元**——那可能是 trivia；
- `SyntaxContext.Process` 在处理完最后一个真实字符时会对根 `SignOut`，递归 `TrySignOut` 到挂载壳，
  把壳的 `End` 先写成最后一个字符（空白 / 注释）的下标。

所以这里**只在「壳还挂载着」时重算一次**：从 `Data` 末尾跳过 trivia 与未签出单元，取最后一个代码单元的 End
（TS 的声明右边界）。`FromUnits` 这类直接建出来、从不挂载的入口保持原有 `SignOut` 结果——
它们的 `End` 可能合法地落在 `;` 上，而 `;` 不在形状的 `Data` 里。

```ts
const mounted = this.Parent !== null && this.Parent.MountedUnit === this;
if (mounted) {
  let at = this.Data.length - 1;
  while (at >= 0 && (this.Data[at].IsTriviaToken || this.Data[at].SourceRange.End < 0)) {
    at--;
  }
  if (at >= 0) {
    const tail = this.Data[at].SourceRange.End;
    if (tail >= 0) {
      this.SourceRange.End = tail;
    }
  }
}
return super.TryToClose(context);
```

## static method FromUnits:(host:Token, start:int, end:int, context:SyntaxContext)=>ImportDeclarationShape

Build one import declaration from a module-body token slice (host is the enclosing Bracket; start/end index host.Data),
including an optional trailing `with`/`assert` attributes clause. Reuses the same children as the root path.

```ts
const code:Array<Token> = [];
for (let at = start; at <= end; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 3) {
  throw new Error("import declaration is incomplete");
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("import")) {
  throw new Error("import declaration is missing import keyword");
}
const semicolon = code[code.length - 1];
if (!(semicolon instanceof Symbol) || !(semicolon as Symbol).Is(";")) {
  throw new Error("import declaration is missing semicolon");
}
const shape = new ImportDeclarationShape(host.Template);
let index = 1;
let isTypeOnly = false;
const keywordEnd = keyword.SourceRange.End;
let childPos = keywordEnd < 0 ? 0 : keywordEnd;
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("type")
  && ImportClauseUtil.IsTypePhaseModifier(code[index])) {
  isTypeOnly = true;
  const typeUnit = code[index] as Common;
  const typeEnd = typeUnit.SourceRange.End;
  childPos = typeEnd < 0 ? childPos : typeEnd;
  index++;
}
// `import defer …`（TS 6.0.3）：`defer` 是 ImportClause 的 phase modifier，不是子节点、也不是默认导入名。
// `import defer from "m"` 里 `defer` 就是默认名（后面是 `from`），所以判据与
// `ImportClauseUtil.IsDeferPhaseModifier` 同一份：后面是 `*` / `{` / 其它名字才当修饰词。
let phaseModifier = "";
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("defer")) {
  const afterDefer = code[index + 1];
  const afterIsFrom = afterDefer instanceof Common && (afterDefer as Common).Is("from");
  if (!afterIsFrom) {
    phaseModifier = "defer";
    const deferEnd = (code[index] as Common).SourceRange.End;
    childPos = deferEnd < 0 ? childPos : deferEnd;
    index++;
  }
}
let clause:ImportClauseShape | null = null;
let specifierUnit:Token | null = null;
let moduleSpecifier:StringLiteralShape | null = null;
if (code[index] instanceof String) {
  // side-effect import: import "n" [with {...}];
  specifierUnit = code[index];
  moduleSpecifier = StringLiteralShape.FromBasicToken(code[index] as String, context);
  moduleSpecifier.Pos = keywordEnd < 0 ? 0 : keywordEnd;
  index++;
} else {
  clause = new ImportClauseShape(host.Template);
  clause.IsTypeOnly = isTypeOnly;
  clause.PhaseModifier = phaseModifier;
  let clauseStart:Token = keyword;
  let clauseEnd:Token = keyword;
  let hasChild = false;
  if (code[index] instanceof Common && !(code[index] as Common).Is("from")) {
    const name = IdentifierShape.FromBasicToken(code[index] as Common, context);
    name.Pos = childPos;
    clause.Name = name;
    clause.Data.push(name);
    name.Parent = clause;
    clauseStart = code[index];
    clauseEnd = code[index];
    hasChild = true;
    index++;
    if (index < code.length - 1 && code[index] instanceof Symbol && (code[index] as Symbol).Is(",")) {
      index++;
    }
  }
  if (code[index] instanceof Bracket && (code[index] as Bracket).StartBracketChar === "{") {
    const brackets = code[index] as Bracket;
    const named = NamedImportsShape.FromBracket(brackets, context);
    const previous = code[index - 1];
    named.Pos = previous.SourceRange.End < 0 ? childPos : previous.SourceRange.EndIndex;
    clause.NamedBindings = named;
    clause.Data.push(named);
    named.Parent = clause;
    if (!hasChild) {
      clauseStart = brackets;
    }
    hasChild = true;
    clauseEnd = brackets;
    index++;
  } else if (code[index] instanceof Symbol && (code[index] as Symbol).Is("*")) {
    const starUnit = code[index];
    const bindingUnits:Array<Token> = [];
    for (let scan = index; scan < code.length - 1 && bindingUnits.length < 3; scan++) {
      bindingUnits.push(code[scan]);
    }
    const namespace = NamespaceImportShape.FromTokens(bindingUnits, context);
    if (namespace === null) {
      throw new Error("import declaration has a bad namespace binding");
    }
    const previous = code[index - 1];
    namespace.Pos = previous.SourceRange.End < 0 ? childPos : previous.SourceRange.EndIndex;
    clause.NamedBindings = namespace;
    clause.Data.push(namespace);
    namespace.Parent = clause;
    if (!hasChild) {
      clauseStart = starUnit;
    }
    hasChild = true;
    clauseEnd = code[Math.min(index + 2, code.length - 1)];
    index += 3;
  }
  if (!hasChild) {
    throw new Error("import declaration is missing import clause");
  }
  if (!(code[index] instanceof Common) || !(code[index] as Common).Is("from")) {
    throw new Error("import declaration is missing from keyword");
  }
  const fromUnit = code[index];
  index++;
  specifierUnit = code[index];
  if (!(specifierUnit instanceof String)) {
    throw new Error("import declaration is missing module specifier");
  }
  moduleSpecifier = StringLiteralShape.FromBasicToken(specifierUnit as String, context);
  moduleSpecifier.Pos = fromUnit.SourceRange.End < 0 ? 0 : fromUnit.SourceRange.EndIndex;
  index++;
  clause.Pos = keywordEnd < 0 ? 0 : keywordEnd;
  if (clauseStart.SourceRange.Start >= 0) {
    clause.SignIn(clauseStart.SourceRange.StartIndex);
  }
  if (clauseEnd.SourceRange.End >= 0) {
    clause.SignOut(clauseEnd.SourceRange.EndIndex);
  }
  clause.TryToClose(context);
}
let attributes:ImportAttributesShape | null = null;
if (index < code.length - 1 && code[index] instanceof Common
  && ((code[index] as Common).Is("with") || (code[index] as Common).Is("assert"))) {
  const attributeKeyword = code[index] as Common;
  index++;
  const attributeBracket = code[index];
  if (!(attributeBracket instanceof Bracket) || (attributeBracket as Bracket).StartBracketChar !== "{") {
    throw new Error("import declaration is missing attributes bracket");
  }
  attributes = ImportAttributesShape.FromBracket(attributeBracket as Bracket, attributeKeyword.TempToString(), context);
  const specifierEnd = specifierUnit === null ? -1 : specifierUnit.SourceRange.End;
  attributes.Pos = specifierEnd < 0 ? 0 : specifierEnd;
  index++;
}
if (index !== code.length - 1) {
  throw new Error("import declaration has trailing units");
}
if (clause !== null) {
  shape.ImportClause = clause;
  shape.Data.push(clause);
  clause.Parent = shape;
}
shape.IsTypeOnly = isTypeOnly;
if (moduleSpecifier !== null) {
  shape.ModuleSpecifier = moduleSpecifier;
  shape.Data.push(moduleSpecifier);
  moduleSpecifier.Parent = shape;
}
if (attributes !== null) {
  shape.Data.push(attributes);
  attributes.Parent = shape;
}
if (keyword.SourceRange.Start >= 0) {
  shape.SignIn(keyword.SourceRange.StartIndex);
}
if (semicolon.SourceRange.End >= 0) {
  shape.SignOut(semicolon.SourceRange.EndIndex);
}
// TS 的 pos 含前导 trivia：= 前一个非 trivia 单元 EndIndex（挂载壳路径不会替它算 Pos）。
let pos = 0;
for (let index = start - 1; index >= 0; index--) {
  if (!host.Data[index].IsTriviaToken) {
    const previousEnd = host.Data[index].SourceRange.End;
    if (previousEnd >= 0) {
      pos = previousEnd;
    }
    break;
  }
}
shape.Pos = pos;
shape.TryToClose(context);
return shape;
```
## protected method Close:(context:SyntaxContext)=>CloseStates

关闭前**先自检、再过滤**：挂载壳在 `BuildByIndex` 里把 `import` / `from` 这些 basic token 原样收进了 `Data`，
所以合法残留要按**白名单**放行（`import` / `from` / `type` / `as` / `;` / `,` / `*`）；白名单外的单元
说明形状吃进了不认识的东西（`import.meta` 就是这一类），当场报错而不是静默丢弃、产出一个空声明。
自检通过后再过滤出子形状字段，最后要求 `ModuleSpecifier` 非空。

```ts
this.Closed = true;
for (const item of this.Data) {
  if (item.IsBasicToken && !this.IsLegalResidue(item)) {
    throw new Error("ImportDeclarationShape.Close: 未识别的单元（" + item.constructor.name + "）");
  }
}
const kept: Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof ImportClauseShape) {
    this.ImportClause = item;
    kept.push(item);
  } else if (item instanceof StringLiteralShape) {
    this.ModuleSpecifier = item;
    kept.push(item);
  } else if (item instanceof ExportKeywordShape) {
    this.Modifiers.push(item);
    kept.push(item);
  } else if (item instanceof DeclareKeywordShape) {
    this.Modifiers.push(item);
    kept.push(item);
  } else if (item instanceof ImportAttributesShape) {
    if ((item as ImportAttributesShape).Token === "assert" && this.AssertClause === null) {
      this.AssertClause = item as ImportAttributesShape;
    } else {
      this.Attributes = item as ImportAttributesShape;
    }
    kept.push(item);
  }
}
this.Data = kept;
if (this.ModuleSpecifier === null) {
  throw new Error("ImportDeclarationShape.Close: 缺少模块说明符");
}
if (this.ImportClause !== null) {
  this.IsTypeOnly = this.ImportClause.IsTypeOnly;
}
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ImportDeclarationShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```

## method IsLegalResidue:(item:Token)=>bool

挂载壳里允许残留的 basic token 白名单：`import` / `from` / `type` / `as` 与 `;` / `,` / `*`。
其余（括号、字符串、`.` 等）本该被子形状吃掉，留下来就是形状吃错了。

```ts
if (item.IsTriviaToken) {
  return true;
}
if (item instanceof Common) {
  const text = (item as Common).TempToString();
  return text === "import" || text === "from" || text === "type" || text === "as" || text === "defer";
}
if (item instanceof Symbol) {
  const text = (item as Symbol).TempToString();
  return text === ";" || text === "," || text === "*";
}
return false;
```

## static method FromCode:(template:Template, code:Array<Token>, pos:int, context:SyntaxContext, hasSemicolon:bool)=>ImportDeclarationShape

用**已切好的代码单元**建一条 import 声明：`code` 是 `DeclarationSpan.Slice` 的结果，`pos` 是全片的 `Pos`。
这是直接建造入口的公共腿——`FromUnits`（宿主切片）与 `BuildDirect`（item 区间）都落到这里。

无分号（ASI）时**不继承宿主的任何东西**：只在本次调用自己的 `units` 数组末尾放一个零宽合成 `;`
（`AppendValueAndSignOut` 签出到 `index + 1`，所以签出仍落在最后一个真实单元的 `End` 上），
给 `FromUnits` 的「末格必须是 `;`」口径一个终点。合成 `;` 只活在局部数组里，**不动 `host.Data`**。

```ts
const units:Array<Token> = [];
for (const unit of code) {
  units.push(unit);
}
if (!hasSemicolon && units.length > 0) {
  const last = units[units.length - 1];
  const lastEnd = last.SourceRange.End;
  if (lastEnd >= 0) {
    const semi = new Symbol(template);
    semi.SignIn(lastEnd);
    semi.AppendValueAndSignOut(";", lastEnd - 1);
    units.push(semi);
  }
}
const hostLike:any = { Data: units, Template: template };
const shape = ImportDeclarationShape.FromUnits(hostLike, 0, units.length - 1, context);
shape.Pos = pos;
return shape;
```

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>ImportDeclarationShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条 import 声明（`end` 不含，
结尾 `;` 可有可无 —— ASI 口径由 `hasSemicolon` 表达）。

- 不依赖 `BuildByIndex` / `MountShell` / `ShapeCatalog`；
- **不改 `host.Data`**（切片只读，缺失的 `;` 只在局部数组里合成）；
- 返回 `null` = 这一片不是一条完整的 import 声明（调用方走 raw 兜底）；不抛异常。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length < 3) {
  return null;
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("import")) {
  return null;
}
const hasSemicolon = DeclarationSpan.EndsWithSemicolon(code);
const pos = DeclarationSpan.PosBefore(host, start);
try {
  return ImportDeclarationShape.FromCode(host.Template, code, pos, context, hasSemicolon);
} catch {
  return null;
}
```
