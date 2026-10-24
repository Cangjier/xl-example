# dependencies
```xl
import { CloseStates } from "../close-states.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { BasicTokenBatch } from "./basic-token-batch.xl.md"
import { BatchPolicy } from "./batch-policy.xl.md"
import { BatchStates } from "./batch-states.xl.md"
```

# namespace cangjie

批次消费契约：**容器**（`SourceFileShape` / body `Bracket` / block `Bracket`）唯一实现它。
item shape 永远不实现本接口（`OnBasicTokens` 只属于容器）。

宿主在挂载时一律装 `ItemListEngine`（唯一实现），不再有新旧两条路径。

# interface IBatchHost

## property BatchPolicy:BatchPolicy | null

软边界策略；`null` 表示该宿主只用硬边界 flush。

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

消费一个批次，返回后续动作（`Done` / `NeedMore` / `Reload` / `Undo`）。

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

子单元（括号）创建事件：原 `OnBracketCreatedEvent` 改名，签名不变。

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

basic token 关闭的宿主侧默认实现；默认实现在 `UnitToken`，本接口只固化契约。

## method CloseBatch:(context:SyntaxContext)=>BatchStates

硬边界 flush：把尚未收口的批次交出去。

## method Reset:()=>void

卸载/重建宿主时清空批次状态（默认空实现可覆写）。
