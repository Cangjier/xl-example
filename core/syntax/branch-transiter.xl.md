# dependencies
```xl
import { BranchStates } from "./branch-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

# type BranchTransiter = (context:SyntaxContext, unit:Token, buffer:SourceRange, index:number)=>BranchStates

一次跳转尝试**就是一个函数**：看窗口里 `index` 处的字符归不归自己，归就处理并返回 `Done`，不归就 `Undo`；处理过程中建出形状（关掉上一个 token 时）就返回 `Reload`。

`buffer` 是 `[index, index + BufferSize)` 的窗口；字符用 `buffer.At(index)` 取。**消费了字符就必须推进 `context.Index`**（`Done` 而没推进时，`UnitToken.Process` 会统一补 `+1`）；`Undo` / `Reload` 不推进。

它不需要是类：分支没有实例状态、没有继承、只有一个方法。写成函数之后，跳转队列里放的就是函数引用，`Branch` 那个类型连同它的 `Transit` 包装一起消失。
