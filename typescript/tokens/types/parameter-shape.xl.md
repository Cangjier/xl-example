# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ParameterShape extends ShapeToken

```txt
type T = (a: A) => B;
type T = (a?: A) => B;
type T = { [k: string]: A };
```

参数。children 顺序与 TS 一致：`Identifier`（名字）、可选的 `QuestionToken`（`?`）、`TypeReference`（类型标注）。
区间从名字开始到类型标注结束；`Pos` 含前导 trivia（第一个参数是 `(` 之后，其余是逗号之后）。

表达式那边的箭头函数也会建它（`a => a` / `(a) => a`），那种形态没有 `?` 与类型标注，字段留 `null`。

字段不叫 `Name`：`cjAst` 会把形状上的 `Name` 读成 AST 的 `name`，而 TS 的 `Parameter` 没有这个字段。

## field ParameterName:Token | null = null

## field QuestionToken:Token | null = null

## field Type:Token | null = null

## constructor:(template:Template)=>void

```ts
super(template);
```
