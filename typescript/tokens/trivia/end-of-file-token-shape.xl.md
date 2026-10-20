# dependencies
```xl
import { CloseStates } from "../../../core/syntax/close-states.xl.md"
import { ComputePossibleShapesStates } from "../../../core/syntax/compute-possible-shapes-states.xl.md"
import { IComputePossibleShapes } from "../../../core/syntax/i-compute-possible-shapes.xl.md"
import { ShapeToken } from "../../../core/syntax/shape-token.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

# class EndOfFileTokenShape extends ShapeToken

```txt
const x = 1;
           ^ 文件末尾（下标 -1 的哨兵位置）
```

文件末尾哨兵：`SourceFileShape.Process` 在 `Source.IsEOF` 时造一个、签入签出同一个 EOF 位置、加进根单元，然后 `TryToClose`。
它不占真实字符、不读文档；`SourceFileShape.Close` 会把它从 `Data` 里过滤掉，所以它不进 XML、也不进 AST。

## field IsBasicToken:bool = true

basic 单元：候选目录按 `ItemUtil.ItemStart` 跳过 basic token，所以 EOF 处普通候选能看见它、并在 `CanStart` 上拒绝；
终结候选则靠它认「文件到头了」。

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：标记已关闭，再**只问父单元**要不要重算候选。

根单元的终结候选在这一刻 `Accept`：签出最后一个真实代码单元（如果根还没签出）、关闭根。所以根的关闭由 EOF 的关闭驱动，
`SyntaxContext.Process` 末尾不再手动 `TryToClose`。

```ts
this.Closed = true;
const parent = this.Parent;
if (parent !== null && "ComputePossibleShapes" in parent) {
  const state = (parent as unknown as IComputePossibleShapes).ComputePossibleShapes(context);
  if (state === ComputePossibleShapesStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```
