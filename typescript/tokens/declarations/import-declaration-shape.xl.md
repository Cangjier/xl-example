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
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { ImportAttributesPossibleShape } from "./import-attributes-possible-shape.xl.md"
import { ImportDeclarationEndPossibleShape } from "./import-declaration-end-possible-shape.xl.md"
import { ImportClausePossibleShape } from "./import-clause-possible-shape.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
import { NamedImportsShape } from "./named-imports-shape.xl.md"
import { NamespaceImportShape } from "./namespace-import-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
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
let childPos = keywordEnd === null ? 0 : keywordEnd.Index + 1;
if (index < code.length - 1 && code[index] instanceof Common && (code[index] as Common).Is("type")) {
  isTypeOnly = true;
  const typeUnit = code[index] as Common;
  const typeEnd = typeUnit.SourceRange.End;
  childPos = typeEnd === null ? childPos : typeEnd.Index + 1;
  index++;
}
let clause:ImportClauseShape | null = null;
let specifierUnit:Token | null = null;
let moduleSpecifier:StringLiteralShape | null = null;
if (code[index] instanceof String) {
  // side-effect import: import "n" [with {...}];
  specifierUnit = code[index];
  moduleSpecifier = StringLiteralShape.FromBasicToken(code[index] as String, context);
  moduleSpecifier.Pos = keywordEnd === null ? 0 : keywordEnd.Index + 1;
  index++;
} else {
  clause = new ImportClauseShape(host.Template);
  clause.IsTypeOnly = isTypeOnly;
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
    named.Pos = previous.SourceRange.End === null ? childPos : previous.SourceRange.End.Index + 1;
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
    namespace.Pos = previous.SourceRange.End === null ? childPos : previous.SourceRange.End.Index + 1;
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
  moduleSpecifier.Pos = fromUnit.SourceRange.End === null ? 0 : fromUnit.SourceRange.End.Index + 1;
  index++;
  clause.Pos = keywordEnd === null ? 0 : keywordEnd.Index + 1;
  if (clauseStart.SourceRange.Start !== null) {
    clause.SignIn(clauseStart.SourceRange.Start);
  }
  if (clauseEnd.SourceRange.End !== null) {
    clause.SignOut(clauseEnd.SourceRange.End);
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
  const specifierEnd = specifierUnit === null ? null : specifierUnit.SourceRange.End;
  attributes.Pos = specifierEnd === null ? 0 : specifierEnd.Index + 1;
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
