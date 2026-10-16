# dependencies
```xl
import { AstNode } from "../ast-node.xl.md"
import { StringLiteralAstNode } from "../literals/string-literal-ast-node.xl.md"
import { IdentifierAstNode } from "../names/identifier-ast-node.xl.md"
```

# namespace cangjie

# class ImportSpecifierAstNode extends AstNode

## field Kind:string = "ImportSpecifier"

## field PropertyName:IdentifierAstNode | StringLiteralAstNode | null = null

## field Name:IdentifierAstNode | null = null

## field IsTypeOnly:bool = false
