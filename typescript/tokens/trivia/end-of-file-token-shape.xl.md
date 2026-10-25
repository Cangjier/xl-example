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
           ^ 文件末尾（下标 = 文本长度 count 的空区间位置）
```

## field IsBasicToken:bool = true

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

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
