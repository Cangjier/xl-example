# dependencies
```xl
import { AstNode } from "../ast-node.xl.md"
import { IdentifierAstNode } from "../names/identifier-ast-node.xl.md"
import { NamedImportsAstNode } from "./named-imports-ast-node.xl.md"
import { NamespaceImportAstNode } from "./namespace-import-ast-node.xl.md"
```

# namespace cangjie

# class ImportClauseAstNode extends AstNode

## field Kind:string = "ImportClause"

## field IsTypeOnly:bool = false

## field PhaseModifier:string = ""

## field Name:IdentifierAstNode | null = null

## field NamedBindings:NamespaceImportAstNode | NamedImportsAstNode | null = null
