# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { String } from "../../../core/syntax/basic-tokens/string/string.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { DeclareKeywordShape } from "../keywords/declare-keyword-shape.xl.md"
import { ExportKeywordShape } from "../keywords/export-keyword-shape.xl.md"
import { StringLiteralShape } from "../literals/string-literal-shape.xl.md"
import { ImportAttributesShape } from "../members/import-attributes-shape.xl.md"
import { IdentifierShape } from "../names/identifier-shape.xl.md"
import { ImportClauseShape } from "./import-clause-shape.xl.md"
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
```

## protected method Close:()=>CloseStates

```ts
this.Closed = true;
let fromIndex = -1;
for (let index = 0; index < this.Data.length; index++) {
  const unit = this.Data[index];
  if (unit instanceof Common && unit.Is("from")) {
    fromIndex = index;
    break;
  }
}
if (fromIndex >= 0) {
  for (let index = 1; index < fromIndex; index++) {
    const unit = this.Data[index];
    if (unit instanceof Common && !unit.Is("import")) {
      this.ImportClause = ImportDeclarationShape.BuildImportClause(unit);
      break;
    }
  }
  for (let index = fromIndex + 1; index < this.Data.length; index++) {
    const unit = this.Data[index];
    if (unit instanceof String) {
      this.ModuleSpecifier = ImportDeclarationShape.BuildStringLiteral(unit);
      break;
    }
    if (!unit.IsTriviaToken) {
      break;
    }
  }
}
const kept: Array<Token> = [];
if (this.ImportClause !== null) {
  kept.push(this.ImportClause);
}
if (this.ModuleSpecifier !== null) {
  kept.push(this.ModuleSpecifier);
}
for (const item of this.Data) {
  if (item.IsBasicToken) {
    continue;
  }
  if (item === this.ImportClause || item === this.ModuleSpecifier) {
    continue;
  }
  kept.push(item);
}
this.Data = kept;
for (const item of this.Data) {
  if (item.IsBasicToken) {
    throw new Error("ImportDeclarationShape.Close: Data 里还有 basic token");
  }
}
return CloseStates.Nothing;
```

## private static method BuildIdentifier:(common:Common)=>IdentifierShape

```ts
const shape = new IdentifierShape(common.Template);
if (common.SourceRange.Start !== null) {
  shape.SignIn(common.SourceRange.Start);
}
if (common.SourceRange.End !== null) {
  shape.SignOut(common.SourceRange.End);
}
shape.Add(common);
shape.TryToClose();
return shape;
```

## private static method BuildImportClause:(common:Common)=>ImportClauseShape

```ts
const identifier = ImportDeclarationShape.BuildIdentifier(common);
const clause = new ImportClauseShape(common.Template);
if (common.SourceRange.Start !== null) {
  clause.SignIn(common.SourceRange.Start);
}
if (common.SourceRange.End !== null) {
  clause.SignOut(common.SourceRange.End);
}
clause.Add(identifier);
clause.TryToClose();
return clause;
```

## private static method BuildStringLiteral:(token:String)=>StringLiteralShape

```ts
const shape = new StringLiteralShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.Add(token);
shape.TryToClose();
return shape;
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
