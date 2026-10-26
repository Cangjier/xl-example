# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
```

# namespace cangjie

# class BinaryExpressionShape extends ShapeToken

```txt
a + b;
```

## field OperatorPrecedence:int = -1

本二元表达式的运算符优先级（`OperatorTable.Precedence` 的读数，`-1` = 还没设）。

它只在增量装配里写；判「再来的运算符该往上长还是往里长」只读 `operator-table` 这一份表（C 口径：禁抄表）。

## constructor:(template:Template)=>void

以模板创建形状单元。

```ts
super(template);
```

## static method FromLeftAndOperator:(left:Token, operator:Token, precedence:int, template:Template)=>BinaryExpressionShape

由「左操作数 + 运算符」建一个还**没封右边界**的二元表达式（C3）：

- `src` 从**左操作数的起点**签入（`2*3` 的右边界此刻还没到，留给右操作数关闭那一次封口）；
- `Pos` 取左操作数的 `Pos`（C1：`2` 的 `Pos` = 7，`Binary(*)` 的 `Pos` 也是 7）；
- 左操作数与运算符成为本形状的子单元（父指针由 `Add` 设）。

```ts
const shape = new BinaryExpressionShape(template);
if (left.SourceRange.Start >= 0) {
  shape.SignIn(left.SourceRange.Start);
}
if (!(left instanceof ShapeToken)) {
  throw new Error("增量变量形状未支持：expression 左操作数不是形状");
}
const leftShape = left as ShapeToken;
if (leftShape.Pos < 0) {
  throw new Error("增量变量形状未支持：expression 左操作数没有 Pos");
}
shape.Pos = leftShape.Pos;
shape.OperatorPrecedence = precedence;
shape.Add(left);
shape.Add(operator);
return shape;
```

## method SealRightOperand:(context:SyntaxContext)=>void

右操作数**关闭的那一次**由它的候选调用本方法（C3 的封口点）：

1. `TryToClose`：`ShapeToken.TryToClose` 会用「最后一个子单元（= 刚建好的右操作数）的终点」补齐右边界；
   于是 `2*3` 的 `Binary(*)` 在这里封成 `src=[8,11)`；
2. 已挂载就 `Quit` 卸载：`Quit` 只清 `Parent.MountedUnit`，后续字符自然回到父层（`VariableDeclarationShape`），
   不需要任何 core 钩子。

```ts
this.TryToClose(context);
if (this.Parent !== null && this.Parent.MountedUnit === this) {
  this.Quit();
}
```

## protected method Close:(context:SyntaxContext)=>CloseStates

先关掉还没关闭的子单元，再把自己标记为已关闭。

**为什么需要**：EOF 收口时右操作数（`Common("1")`）还是未关闭的 basic 单元，没有「下一个字符」来关它；
它自己的 `Close` 正是「问父单元目录」的触发点，会就地把它换成 `NumericLiteralShape` 并叫
`SealRightOperand` 封口。默认（legacy）路径里的 `BinaryExpressionShape` 子单元都已关闭，这段循环是空转。

```ts
for (const item of this.Data.slice()) {
  if (!item.Closed) {
    item.TryToClose(context);
  }
}
this.Closed = true;
return CloseStates.Nothing;
```
