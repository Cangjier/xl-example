# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ImportTypeShape extends ShapeToken

```txt
type T = import("m").A;
type T = import("m").A<B>;
```

## field Argument:Token | null = null

## field AssertClause:Token | null = null

## field Qualifier:Token | null = null

## field TypeArguments:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
