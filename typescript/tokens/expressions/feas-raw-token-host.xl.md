# dependencies
```xl
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { SourceRange } from "../../../core/syntax/source-range.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
```

# namespace cangjie

# class FeasRawTokenHost extends UnitToken

只收 basic token、不挂 `CatalogGuide` 的宿主：`Data` 里是**真实 basic token 流**（空白被吞、注释是 trivia、括号是 `Bracket` 单元），交给可行性原型的增量表达式解析器消费。

它不是 `ShapeToken`，所以没有挂载形状的能力；`ProcessQueue` 显式接 basic 队列，`Default` 空实现（空白由调度层统一 `+1` 吞掉）。

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = Template.BasicBranchQueue();
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
return BranchStates.Undo;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
// 空实现：空白与未知字符由调度层统一 +1 吞掉。
```
