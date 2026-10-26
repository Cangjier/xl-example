# dependencies
```xl
import { Bracket } from "../../../core/syntax/basic-tokens/bracket.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
```

# namespace cangjie

# class BlockShape extends ShapeToken

```txt
{ }
{ let x = 1; }
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## method ComputePossibleShapes:(context:SyntaxContext)=>ComputePossibleShapesStates

**[B1b] 体括号「关闭转发」**：`FunctionDeclarationShape.OpenFunctionBody` 在 `{` 创建格就把本壳挂进声明，
函数体括号是本壳的 `MountedUnit`。`}` 关闭时 `Bracket.Close` 只问父单元（= 本壳），本壳先按括号终点把
自己收口，再把通知**原样转给父单元**——父单元是声明壳时，`CatalogGuide` 的终结候选
（`FunctionDeclarationEndPossibleShape`）就在这一格接受已闭合的 `BlockShape`，整条声明照 legacy 收口。

`MountedUnit` 不是已闭合括号时本方法一个字节都不改，与基类 `UnitToken.ComputePossibleShapes` 等价：
`CatalogGuide === null` 的普通块壳照样返回 `Nothing`；legacy 建出来的块壳没有 raw 括号子单元，
走不到上面的分支。

```ts
const mounted = this.MountedUnit;
if (!this.Closed && mounted !== null && mounted instanceof Bracket && (mounted as Bracket).Closed) {
  this.TryToClose(context);
}
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  return (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
}
return ComputePossibleShapesStates.Nothing;
```
