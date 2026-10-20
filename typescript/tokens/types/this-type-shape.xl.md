# dependencies
```xl
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Common } from "../../../core/syntax/basic-tokens/common.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class ThisTypeShape extends ShapeToken

```txt
type T = this;
```

`this` 类型：TS 的 kind 是 `ThisType`（不是 `ThisKeyword`，那个是表达式里的 `this`）。
叶子形状，没有子节点；`Pos` 由 `TypeBuilder` 按含前导 trivia 的口径补上。

## constructor:(template:Template)=>void

```ts
super(template);
```

## static method FromBasicToken:(token:Common, context:SyntaxContext)=>ThisTypeShape

从 `this` 关键字单元建叶子，区间取该单元的范围；`Pos` 留给调用方按 `Positions` 补。

```ts
const shape = new ThisTypeShape(token.Template);
if (token.SourceRange.Start !== null) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End !== null) {
  shape.SignOut(token.SourceRange.End);
}
shape.TryToClose(context);
return shape;
```
