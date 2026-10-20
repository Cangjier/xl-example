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

## field ModuleSpecifier:StringLiteralShape | null = null

## field AssertClause:ImportAttributesShape | null = null

## field Attributes:ImportAttributesShape | null = null

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(ExportDeclarationShape.CreatePossibleShapes(), new ExportDeclarationEndPossibleShape());
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
const keywordEnd = keyword.SourceRange.End;
let clausePos = keywordEnd === null ? 0 : keywordEnd.Index + 1;
if (isTypeOnly) {
  const typeEnd = code[index - 1].SourceRange.End;
  clausePos = typeEnd === null ? clausePos : typeEnd.Index + 1;
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
  if (!(specifierUnit instanceof String)) {
    throw new Error("export declaration is missing module specifier");
  }
  const moduleSpecifier = StringLiteralShape.FromBasicToken(specifierUnit as String, context);
  moduleSpecifier.Pos = fromUnit.SourceRange.End === null ? 0 : fromUnit.SourceRange.End.Index + 1;
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
  const attributePreviousEnd = attributePrevious.SourceRange.End;
  attributes.Pos = attributePreviousEnd === null ? 0 : attributePreviousEnd.Index + 1;
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
    const end = host.Data[at].SourceRange.End;
    if (end !== null) {
      pos = end.Index + 1;
    }
    break;
  }
}
shape.Pos = pos;
if (keyword.SourceRange.Start !== null) {
  shape.SignIn(keyword.SourceRange.Start);
}
if (semicolon.SourceRange.End !== null) {
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
  } else if (item instanceof StringLiteralShape) {
    this.ModuleSpecifier = item as StringLiteralShape;
    kept.push(item);
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
