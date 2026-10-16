# dependencies
```xl
import { AstNode } from "../ast-node.xl.md"
import { ExpressionAstNode } from "../expressions/expression-ast-node.xl.md"
import { StringLiteralAstNode } from "../literals/string-literal-ast-node.xl.md"
import { IdentifierAstNode } from "../names/identifier-ast-node.xl.md"
```

# namespace cangjie

# class ImportAttributeAstNode extends AstNode

## field Kind:string = "ImportAttribute"

## field Name:IdentifierAstNode | StringLiteralAstNode | null = null

## field Value:ExpressionAstNode | null = null
