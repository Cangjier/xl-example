# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CatalogGuide } from "../../../core/syntax/catalog-guide.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
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
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { ImportAttributesPossibleShape } from "./import-attributes-possible-shape.xl.md"
import { ImportDeclarationEndPossibleShape } from "./import-declaration-end-possible-shape.xl.md"
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

## field IsTypeOnly:bool = false

## constructor:(template:Template)=>void

```ts
super(template);
this.CatalogGuide = new CatalogGuide(ImportDeclarationShape.CreatePossibleShapes(), new ImportDeclarationEndPossibleShape());
```

## private static field CreatePossibleShapesCache:Array<PossibleShape> | null = null

## static method CreatePossibleShapes:()=>Array<PossibleShape>

```ts
if (ImportDeclarationShape.CreatePossibleShapesCache === null) {
  ImportDeclarationShape.CreatePossibleShapesCache = [
    new ImportClausePossibleShape(),
    new StringLiteralPossibleShape(),
    new ImportAttributesPossibleShape(),
  ];
}
return ImportDeclarationShape.CreatePossibleShapesCache;
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
  return text === "import" || text === "from" || text === "type" || text === "as";
}
if (item instanceof Symbol) {
  const text = (item as Symbol).TempToString();
  return text === ";" || text === "," || text === "*";
}
return false;
```
