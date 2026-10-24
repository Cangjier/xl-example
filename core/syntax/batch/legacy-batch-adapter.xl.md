# dependencies
```xl
import { CloseStates } from "../close-states.xl.md"
import { ItemComputeStates } from "../item-compute-states.xl.md"
import { IItemCompute } from "../i-item-compute.xl.md"
import { SyntaxContext } from "../syntax-context.xl.md"
import { Token } from "../token.xl.md"
import { BasicTokenBatch } from "./basic-token-batch.xl.md"
import { BatchPolicy } from "./batch-policy.xl.md"
import { BatchStates } from "./batch-states.xl.md"
import { IBatchHost } from "./i-batch-host.xl.md"
```

# namespace cangjie

Legacy 适配层（过渡期，WP-7 删）：把批次拆回**逐 token 问旧目录向导**，
旧路径的实现一字不动。`BatchMode=0` 时所有宿主都装它，因此行为与基线逐字节一致；
未迁移的宿主在 `BatchMode=1` 时也继续装它。

# class LegacyBatchAdapter implements IBatchHost

## field Host:Token | null = null

被包装的宿主（旧路径里的 `UnitToken`）。

## field BatchPolicy:BatchPolicy | null = null

旧路径没有软边界策略：保持 `null`。

## constructor:(host:Token)=>void

```ts
this.Host = host;
```

## method OnBasicTokens:(batch:BasicTokenBatch, context:SyntaxContext)=>BatchStates

对批内每个已关闭 token 依次问旧目录；任一次建出形状就报 `Reload`，否则 `NeedMore`。

```ts
const host = this.Host;
if (host === null) {
  return BatchStates.Done;
}
for (let i = batch.From; i < batch.To; i++) {
  const token = host.Data[i];
  if (token === undefined) {
    continue;
  }
  if (this.Ask(context) === CloseStates.Built) {
    return BatchStates.Reload;
  }
}
return BatchStates.NeedMore;
```

## method OnChildCreated:(child:Token, context:SyntaxContext)=>void

转交旧的括号创建事件（`OnBracketCreatedEvent`，签名不变）。

```ts
const host = this.Host;
if (host === null) {
  return;
}
if ("OnBracketCreatedEvent" in host) {
  const legacy = host as unknown as { OnBracketCreatedEvent: (child: Token, context: SyntaxContext) => void };
  legacy.OnBracketCreatedEvent(child, context);
}
```

## method OnBasicTokenClosed:(token:Token, context:SyntaxContext)=>CloseStates

宿主侧默认实现：与旧 `basic token Close` 里那段完全等价。

```ts
return this.Ask(context);
```

## method CloseBatch:(context:SyntaxContext)=>BatchStates

旧路径没有批次收口动作：直接 `Done`。

```ts
return BatchStates.Done;
```

## method Reset:()=>void

只清宿主引用。

```ts
this.Host = null;
```

## private method Ask:(context:SyntaxContext)=>CloseStates

问宿主：旧 `ComputeItems` 这次有没有建出形状。

```ts
const host = this.Host;
if (host === null) {
  return CloseStates.Nothing;
}
if ("ComputeItems" in host) {
  const legacy = host as unknown as IItemCompute;
  if (legacy.ComputeItems(context) === ItemComputeStates.Built) {
    return CloseStates.Built;
  }
}
return CloseStates.Nothing;
```
