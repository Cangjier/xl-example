# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class TypePredicateShape extends ShapeToken

```txt
type T = (x: A) => x is B;
type T = (x: A) => asserts x is B;
type T = asserts x is B;
```

类型谓词：children 顺序与 TS 一致 = 可选 `AssertsKeyword`、`Identifier`（被断言的名字）、类型；`is` 不进 AST。
实测 `(x: A) => x is B` 是 `TypePredicate[18,25) → [Identifier[18,20) x, TypeReference[23,25) B]`；
带 `asserts` 时前面多一个 `AssertsKeyword[18,26)`。

字段不叫 `Name`（`cjAst` 会按名字嗅探）。

## field AssertsToken:Token | null = null

## field ParameterName:Token | null = null

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
