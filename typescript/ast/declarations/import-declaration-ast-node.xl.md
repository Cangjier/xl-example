# dependencies
```xl
import { AstNode } from "../ast-node.xl.md"
import { ExportKeywordAstNode } from "../keywords/export-keyword-ast-node.xl.md"
import { DeclareKeywordAstNode } from "../keywords/declare-keyword-ast-node.xl.md"
import { StringLiteralAstNode } from "../literals/string-literal-ast-node.xl.md"
import { ImportAttributesAstNode } from "../members/import-attributes-ast-node.xl.md"
import { ImportDeclarationShape } from "../../shapes/declarations/import-declaration-shape.xl.md"
import { ImportClauseAstNode } from "./import-clause-ast-node.xl.md"
```

# namespace cangjie

# class ImportDeclarationAstNode extends AstNode

## field Kind:string = "ImportDeclaration"

## field Modifiers:Array<ExportKeywordAstNode | DeclareKeywordAstNode> = []

## field ImportClause:ImportClauseAstNode | null = null

## field ModuleSpecifier:StringLiteralAstNode | null = null

## field AssertClause:ImportAttributesAstNode | null = null

## field Attributes:ImportAttributesAstNode | null = null

## static method ParseFromShape:(shape:ImportDeclarationShape)=>ImportDeclarationAstNode

```ts
throw new Error("ImportDeclarationAstNode.ParseFromShape 未实现");
```
