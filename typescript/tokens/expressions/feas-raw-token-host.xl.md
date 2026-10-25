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
