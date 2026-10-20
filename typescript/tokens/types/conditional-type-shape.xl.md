# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ConditionalTypeShape extends ShapeToken

```txt
type T = A extends B ? C : D;
type T = A extends B ? C : D extends E ? F : G;
```

条件类型：children 顺序与 TS 一致 = [checkType, extendsType, trueType, falseType]。
`extends` / `?` / `:` 都不进 AST（实测 `A extends B ? C : D` 是 `ConditionalType[8,28)` 四个孩子，
`extendsType` 的 `pos` 从 `extends` 之后算、`trueType` 从 `?` 之后、`falseType` 从 `:` 之后）。

区间的 `Pos` 是 checkType 的口径（含前导 trivia），终点是 falseType 的终点。falseType 右结合（可再是条件类型）。

字段不叫 `Name`/`Modifiers`（`cjAst` 会按名字嗅探它们）。

## field CheckType:Token | null = null

## field ExtendsType:Token | null = null

## field TrueType:Token | null = null

## field FalseType:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
