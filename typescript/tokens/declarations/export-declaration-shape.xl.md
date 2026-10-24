# dependencies
```xl
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ExportDeclarationEndPossibleShape } from "./export-declaration-end-possible-shape.xl.md"
import { ImportAttributesPossibleShape } from "./import-attributes-possible-shape.xl.md"
import { NamedExportsPossibleShape } from "./named-exports-possible-shape.xl.md"
import { NamespaceExportPossibleShape } from "./namespace-export-possible-shape.xl.md"
import { StringLiteralPossibleShape } from "../literals/string-literal-possible-shape.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { NamedExportsShape } from "./named-exports-shape.xl.md"
import { NamespaceExportShape } from "./namespace-export-shape.xl.md"
import { ParenthesizedExpressionShape } from "../expressions/parenthesized-expression-shape.xl.md"
import { DeclarationSpan } from "../items/module-item-rule.xl.md"
```

# namespace cangjie

# class ExportDeclarationShape extends ShapeToken

```txt
export { a };
export { a as b };
export { a } from "m";
export * from "m";
export * as ns from "m";
export type { T };
```

## field IsTypeOnly:bool = false

## field ExportClause:NamedExportsShape | NamespaceExportShape | null = null

## field ModuleSpecifier:Token | null = null

## field AssertClause:ImportAttributesShape | null = null

## field Attributes:ImportAttributesShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(ExportDeclarationShape.CreatePossibleShapes(), new ExportDeclarationEndPossibleShape());
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
  while (at >= 0 && (this.Data[at].IsTriviaToken || this.Data[at].SourceRange.EndIndex < 0)) {
    at--;
  }
  if (at >= 0) {
    const tail = this.Data[at].SourceRange.End;
    if (tail !== null) {
      this.SourceRange.End = tail;
    }
  }
}
return super.TryToClose(context);
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (ExportDeclarationShape.CreatePossibleShapesCache === null) {
  ExportDeclarationShape.CreatePossibleShapesCache = [
    new NamedExportsPossibleShape(),
    new NamespaceExportPossibleShape(),
    new StringLiteralPossibleShape(),
    new ImportAttributesPossibleShape(),
  ];
}
return ExportDeclarationShape.CreatePossibleShapesCache;
```

## static method FromUnits:(host:Token, start:int, end:int, context:SyntaxContext)=>ExportDeclarationShape

Build one export declaration from a module-body token slice (host is the enclosing Bracket; start/end index
host.Data). Reuses the same children as the root path: ExportClause (NamedExports / NamespaceExport), the
module StringLiteral and optional with/assert attributes; `export` / `type` / `from` are not AST children.

```ts
const code:Array<Token> = [];
for (let at = start; at <= end; at++) {
  if (!host.Data[at].IsTriviaToken) {
    code.push(host.Data[at]);
  }
}
if (code.length < 3) {
  throw new Error("export declaration is incomplete");
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  throw new Error("export declaration is missing export keyword");
}
const semicolon = code[code.length - 1];
if (!(semicolon instanceof Symbol) || !(semicolon as Symbol).Is(";")) {
  throw new Error("export declaration is missing semicolon");
}
const shape = new ExportDeclarationShape(host.Template);
let index = 1;
let isTypeOnly = false;
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("type")) {
  isTypeOnly = true;
  index++;
}
if (index >= code.length - 1) {
  throw new Error("export declaration is missing export clause");
}
const keywordEnd = keyword.SourceRange.EndIndex;
let clausePos = keywordEnd < 0 ? 0 : keywordEnd;
if (isTypeOnly) {
  const typeEnd = code[index - 1].SourceRange.EndIndex;
  clausePos = typeEnd < 0 ? clausePos : typeEnd;
}
if (code[index] instanceof Symbol && (code[index] as Symbol).Is("*")) {
  const starUnit = code[index];
  index++;
  if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("as")) {
    const aliasUnit = code[index + 1];
    if (!(aliasUnit instanceof Common)) {
      throw new Error("export namespace alias is missing a name");
    }
    const namespace = NamespaceExportShape.FromTokens([starUnit, code[index], aliasUnit], context);
    if (namespace === null) {
      throw new Error("export namespace alias is invalid");
    }
    namespace.Pos = clausePos;
    shape.ExportClause = namespace;
    shape.Data.push(namespace);
    namespace.Parent = shape;
    index += 2;
  }
} else if (code[index] instanceof Bracket && (code[index] as Bracket).StartBracketChar === "{") {
  const named = NamedExportsShape.FromBracket(code[index] as Bracket, context);
  named.Pos = clausePos;
  shape.ExportClause = named;
  shape.Data.push(named);
  named.Parent = shape;
  index++;
} else {
  throw new Error("export declaration has an unsupported clause");
}
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("from")) {
  const fromUnit = code[index];
  index++;
  const specifierUnit = code[index];
  let moduleSpecifier:Token;
  if (specifierUnit instanceof String) {
    moduleSpecifier = StringLiteralShape.FromBasicToken(specifierUnit as String, context);
  } else if (specifierUnit instanceof Bracket
    && (specifierUnit as Bracket).StartBracketChar === "("
    && (specifierUnit as Bracket).EndBracketChar === ")") {
    // `export { a }\nfrom("m")`：TS 的 moduleSpecifier 是 ParenthesizedExpression（child 是
    // StringLiteral）。括号化是恢复形，但 TS 的 AST 就是这两层，投影必须补齐。
    const holder = specifierUnit as Bracket;
    let literalToken:String | null = null;
    for (const item of holder.Data) {
      if (!item.IsTriviaToken && item instanceof String) {
        literalToken = item as String;
        break;
      }
    }
    if (literalToken === null) {
      throw new Error("export declaration is missing module specifier");
    }
    const literal = StringLiteralShape.FromBasicToken(literalToken, context);
    const parenthesized = new ParenthesizedExpressionShape(host.Template);
    parenthesized.Add(literal);
    if (holder.SourceRange.StartIndex >= 0) {
      parenthesized.SignIn(holder.SourceRange.Start);
    }
    if (holder.SourceRange.EndIndex >= 0) {
      parenthesized.SignOut(holder.SourceRange.End);
    }
    parenthesized.Pos = fromUnit.SourceRange.EndIndex < 0 ? 0 : fromUnit.SourceRange.EndIndex;
    parenthesized.TryToClose(context);
    moduleSpecifier = parenthesized;
  } else {
    throw new Error("export declaration is missing module specifier");
  }
  (moduleSpecifier as ShapeToken).Pos = fromUnit.SourceRange.EndIndex < 0 ? 0 : fromUnit.SourceRange.EndIndex;
  shape.ModuleSpecifier = moduleSpecifier;
  shape.Data.push(moduleSpecifier);
  moduleSpecifier.Parent = shape;
  index++;
}
if (index < code.length - 1 && code[index] instanceof Common
  && ((code[index] as Common).Is("with") || (code[index] as Common).Is("assert"))) {
  const attributeKeyword = code[index] as Common;
  index++;
  const attributeBracket = code[index];
  if (!(attributeBracket instanceof Bracket) || (attributeBracket as Bracket).StartBracketChar !== "{") {
    throw new Error("export declaration is missing attributes bracket");
  }
  const attributes = ImportAttributesShape.FromBracket(attributeBracket as Bracket, attributeKeyword.TempToString(), context);
  const attributePrevious = code[index - 2];
  const attributePreviousEnd = attributePrevious.SourceRange.EndIndex;
  attributes.Pos = attributePreviousEnd < 0 ? 0 : attributePreviousEnd;
  shape.Data.push(attributes);
  attributes.Parent = shape;
  index++;
}
if (index !== code.length - 1) {
  throw new Error("export declaration has trailing units");
}
shape.IsTypeOnly = isTypeOnly;
let pos = 0;
for (let at = start - 1; at >= 0; at--) {
  if (!host.Data[at].IsTriviaToken) {
    const end = host.Data[at].SourceRange.EndIndex;
    if (end !== null) {
      pos = end;
    }
    break;
  }
}
shape.Pos = pos;
if (keyword.SourceRange.StartIndex >= 0) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (semicolon.SourceRange.EndIndex >= 0) {
  shape.SignOut(semicolon.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
const kept:Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof NamedExportsShape) {
    this.ExportClause = item as NamedExportsShape;
    kept.push(item);
  } else if (item instanceof NamespaceExportShape) {
    this.ExportClause = item as NamespaceExportShape;
    kept.push(item);
  } else if (item instanceof StringLiteralShape || item instanceof ParenthesizedExpressionShape) {
    this.ModuleSpecifier = item as Token;
    kept.push(item);
  } else if (item instanceof Bracket && (item as Bracket).StartBracketChar === "("
    && (item as Bracket).EndBracketChar === ")") {
    // 根级挂载壳路径：`export { a }\nfrom("m")` 的括号化 moduleSpecifier 由 Bracket 单元承载，
    // TS 的 AST 是 ParenthesizedExpression > StringLiteral，这里补投影。
    const holder = item as Bracket;
    let literalToken:String | null = null;
    for (const part of holder.Data) {
      if (!part.IsTriviaToken && part instanceof String) {
        literalToken = part as String;
        break;
      }
    }
    if (literalToken !== null) {
      const literal = StringLiteralShape.FromBasicToken(literalToken, context);
      const parenthesized = new ParenthesizedExpressionShape(this.Template);
      parenthesized.Add(literal);
      if (holder.SourceRange.StartIndex >= 0) {
        parenthesized.SignIn(holder.SourceRange.Start);
      }
      if (holder.SourceRange.EndIndex >= 0) {
        parenthesized.SignOut(holder.SourceRange.End);
      }
      parenthesized.Pos = holder.SourceRange.StartIndex < 0 ? 0 : holder.SourceRange.StartIndex;
      parenthesized.TryToClose(context);
      this.ModuleSpecifier = parenthesized as Token;
      kept.push(parenthesized);
    }
  } else if (item instanceof ImportAttributesShape) {
    if ((item as ImportAttributesShape).Token === "assert" && this.AssertClause === null) {
      this.AssertClause = item as ImportAttributesShape;
    } else {
      this.Attributes = item as ImportAttributesShape;
    }
    kept.push(item);
  } else if (item instanceof Common && (item as Common).Is("type")) {
    this.IsTypeOnly = true;
  }
}
this.Data = kept;
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ExportDeclarationShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```

## static method FromCode:(template:Template, code:Array<Token>, pos:int, context:SyntaxContext, hasSemicolon:bool)=>ExportDeclarationShape

用**已切好的代码单元**建一条 export 声明：`code` 是 `DeclarationSpan.Slice` 的结果，`pos` 是全片的 `Pos`。
`FromUnits`（宿主切片）与 `BuildDirect`（item 区间）都落到这里。

无分号（ASI）时只在本次调用自己的 `units` 数组末尾放一个零宽合成 `;`（签出仍落在最后一个真实单元的
`End` 上），给 `FromUnits` 的「末格必须是 `;`」口径一个终点；**不动 `host.Data`**。

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
const shape = ExportDeclarationShape.FromUnits(hostLike, 0, units.length - 1, context);
shape.Pos = pos;
return shape;
```

## static method BuildDirect:(host:Token, start:int, end:int, context:SyntaxContext)=>ExportDeclarationShape | null

**直接建造入口**（WP-3 根级用）：`host.Data[start, end)` 恰好是一条 `export { … } / export * … /
export type { … }` 声明（`end` 不含，结尾 `;` 可有可无）。

- 不依赖 `BuildByIndex` / `MountShell` / `CatalogGuide`；
- **不改 `host.Data`**；
- 返回 `null` = 这一片不是一条完整的 export 声明（调用方走 raw 兜底）；不抛异常。

`export = <expr>` / `export default <expr>` **不**走这里（那是 `ExportAssignmentShape.BuildDirect`，
children 只有表达式）。

```ts
if (start < 0 || end <= start) {
  return null;
}
const code = DeclarationSpan.Slice(host, start, end);
if (code.length < 3) {
  return null;
}
const keyword = code[0];
if (!(keyword instanceof Common) || !(keyword as Common).Is("export")) {
  return null;
}
const second = code[1];
if (second instanceof Symbol && (second as Symbol).Is("=")) {
  return null;
}
if (second instanceof Common && ((second as Common).Is("default") || (second as Common).Is("import")
  || (second as Common).Is("as"))) {
  return null;
}
const hasSemicolon = DeclarationSpan.EndsWithSemicolon(code);
const pos = DeclarationSpan.PosBefore(host, start);
try {
  return ExportDeclarationShape.FromCode(host.Template, code, pos, context, hasSemicolon);
} catch {
  return null;
}
```
