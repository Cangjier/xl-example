# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { PossibleShape } from "../../../core/syntax/possible-shape.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { ItemUtil } from "../item-util.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { ImportClausePossibleShape } from "./import-clause-possible-shape.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
import { StringLiteralPossibleShape } from "../literals/string-literal-possible-shape.xl.md"
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

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(ImportDeclarationShape.CreatePossibleShapes());
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (ImportDeclarationShape.CreatePossibleShapesCache === null) {
  ImportDeclarationShape.CreatePossibleShapesCache = [
    new ImportClausePossibleShape(),
    new StringLiteralPossibleShape(),
  ];
}
return ImportDeclarationShape.CreatePossibleShapesCache;
```

## method ComputePossibleShapes:()=>ComputePossibleShapesStates

```ts
const last = ItemUtil.LastCodeInItem(this.Data);
if (last < 0) {
  return ComputePossibleShapesStates.Nothing;
}
for (const item of this.Data) {
  if (item instanceof StringLiteralShape) {
    return ComputePossibleShapesStates.Nothing;
  }
}
const unit = this.Data[last];
if (unit instanceof Common) {
  const keyword = unit as Common;
  if (
    keyword.Is("import") ||
    keyword.Is("from") ||
    keyword.Is("with") ||
    keyword.Is("type") ||
    keyword.Is("as") ||
    keyword.Is("assert")
  ) {
    return ComputePossibleShapesStates.Nothing;
  }
}
return super.ComputePossibleShapes();
```

## protected method Close:()=>CloseStates

```ts
this.Closed = true;
const kept: Array<Token> = [];
for (const item of this.Data) {
  if (item instanceof ImportClauseShape) {
    this.ImportClause = item;
    kept.push(item);
  } else if (item instanceof StringLiteralShape) {
    this.ModuleSpecifier = item;
    kept.push(item);
  }
}
this.Data = kept;
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ImportDeclarationShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

```ts
const value = source.Value;
if (value === ";") {
  this.SignOut(source);
  const state = this.TryToClose();
  this.Quit();
  if (state === CloseStates.Built) {
    return BranchStates.Reload;
  }
  return BranchStates.Done;
}
if (value === "\n" || value === "\r") {
  const previous = source.Pre();
  if (previous === null) {
    return BranchStates.Undo;
  }
  this.SignOut(previous);
  const state = this.TryToClose();
  this.Quit();
  if (state === CloseStates.Built) {
    return BranchStates.Reload;
  }
  return BranchStates.Done;
}
return BranchStates.Undo;
```
