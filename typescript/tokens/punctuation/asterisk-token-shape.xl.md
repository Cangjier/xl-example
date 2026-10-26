# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class AsteriskTokenShape extends ShapeToken

```txt
*
```

## field Op:string = ""

运算符文本（`"*"`）。工具与 AST 也可以从 `SourceRange` 切片得到同一份文本；
这里存一份是为了让增量装配不必再回读源码（C5：不回读 `ctx.source`）。

## constructor:(template:Template)=>void

以模板创建形状单元（`ShapeToken` 的构造器接上 basic token 跳转队列）。

```ts
super(template);
```

## static method FromSymbol:(token:Symbol, context:SyntaxContext)=>AsteriskTokenShape

把已经关闭的 `Symbol("*")` basic 单元原位换成一个 `AsteriskTokenShape`：

- `SourceRange` 直接沿用 basic 单元的范围（`[9,10)`）；
- `Op` 写 `"*"`；
- `Pos` **不在这里设**：由调用方按 C1 赋（前一个非 trivia 单元的 `SourceRange.EndIndex`）；
- 建完立刻 `TryToClose`：它是一个叶子形状，不需要再吃字符。

```ts
if (!token.Is("*")) {
  throw new Error("增量变量形状未支持：expression 星号运算符 " + token.TempToString());
}
const shape = new AsteriskTokenShape(token.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Op = "*";
shape.TryToClose(context);
return shape;
```
