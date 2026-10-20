# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TemplateLiteralTypeShape extends ShapeToken

```txt
type T = `a${B}c`;
type T = `${A}-${B}`;
```

模板字面量类型：children = `TemplateHead` + 若干 `TemplateLiteralTypeSpan`。
实测 `` `a${B}c` `` 是 `TemplateLiteralType[8,17) → TemplateHead[8,13) text="a", TemplateLiteralTypeSpan[13,17)`；
无插值的 `` `a` `` 不是它，而是 `LiteralType → NoSubstitutionTemplateLiteral`。

## field Head:Token | null = null

## field Spans:Array<Token> = []

## constructor:(template:Template)=>void

```ts
super(template);
```
