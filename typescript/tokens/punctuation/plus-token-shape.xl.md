# dependencies
```xl
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { Symbol } from "../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
```

# namespace cangjie

# class PlusTokenShape extends ShapeToken

```txt
+
```

## field Op:string = ""

运算符文本（`"+"`）。与 `AsteriskTokenShape.Op` 同口：增量装配据此判优先级 / 断句，
不必回读源码（C5）。

## constructor:(template:Template)=>void

以模板创建形状单元。

```ts
super(template);
```

## static method FromSymbol:(token:Symbol, context:SyntaxContext)=>PlusTokenShape

把已经关闭的 `Symbol("+")` basic 单元原位换成一个 `PlusTokenShape`：范围沿用 basic 单元素，
`Op` 写 `"+"`，`Pos` 由调用方按 C1 赋，建完立刻 `TryToClose`。

```ts
if (!token.Is("+")) {
  throw new Error("增量变量形状未支持：expression 加号运算符 " + token.TempToString());
}
const shape = new PlusTokenShape(token.Template);
if (token.SourceRange.Start >= 0) {
  shape.SignIn(token.SourceRange.Start);
}
if (token.SourceRange.End >= 0) {
  shape.SignOut(token.SourceRange.End);
}
shape.Op = "+";
shape.TryToClose(context);
return shape;
```
