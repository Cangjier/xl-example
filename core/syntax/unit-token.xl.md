# dependencies
```xl
import { ComputePossibleShapesStates } from "./compute-possible-shapes-states.xl.md"
import { SyntaxException } from "../exceptions/syntax-exception.xl.md"
import { BranchStates } from "./branch-states.xl.md"
import { CatalogGuide } from "./catalog-guide.xl.md"
import { IComputePossibleShapes } from "./i-compute-possible-shapes.xl.md"
import { PossibleSource } from "./possible-source.xl.md"
import { ReloadMessage } from "./messages/reload-message.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

# class UnitToken extends Token implements IComputePossibleShapes

## field CatalogGuide:CatalogGuide | null = null

## method ComputePossibleShapes:(context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputePossibleShapes(this, context, source);
}
return ComputePossibleShapesStates.Nothing;
```

## method ComputePossibleShapesByIndex:(tokenIndex:int, context:SyntaxContext, source:PossibleSource)=>ComputePossibleShapesStates

```ts
if (this.CatalogGuide !== null) {
  return this.CatalogGuide.ComputePossibleShapesByIndex(this, tokenIndex, context, source);
}
return ComputePossibleShapesStates.Nothing;
```

## constructor:(template:Template)=>void

```ts
super(template);
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
throw new Error("abstract member: ExitOrPre");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
try {
  // 这四样在本次窗口内恒定，逐字符重复读只是多态属性读的开销。
  const end = buffer.End;
  const messages = context.Messages;
  const replaying = context.Replaying;
  const queue = this.ProcessQueue;
  while (index < end) {
    // 本单元已在本次窗口里 Quit（关闭后卸载）：交回父单元处理剩余字符。
    const parent = this.Parent;
    if (parent !== null && parent.MountedUnit !== this) {
      return;
    }
    // 还有未消费的消息（Reload）：先交回驱动层 DrainMessages 重放，保证重放先于后续字符。
    // 重放本身（窗口只有一个位置）不受这条约束：队列里可能还有排在它后面的消息。
    if (!replaying && messages.length > 0) {
      return;
    }
    const mountedUnit = this.MountedUnit;
    if (mountedUnit !== null) {
      mountedUnit.Process(context, buffer, index);
      if (context.Index === index) {
        return;
      }
      this.LastIndex = context.Index - 1;
      index = context.Index;
      continue;
    }
    const value = buffer.ValueAt(index);
    const exitState = this.ExitOrPre(context, buffer, index, value);
    if (exitState === BranchStates.Reload) {
      context.Messages.push(new ReloadMessage(null, index));
      return;
    }
    if (exitState === BranchStates.Done) {
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
      continue;
    }
    let transited = false;
    if (queue !== null) {
      // 当前字符只读一次，顺链传给每条跳转（basic token 的 Transit 不再各自 `buffer.At(index)`）。
      const branches = queue.Data;
      for (let branch = 0; branch < branches.length; branch++) {
        const state = branches[branch](context, this, buffer, index, value);
        if (state === BranchStates.Reload) {
          context.Messages.push(new ReloadMessage(null, index));
          return;
        }
        if (state === BranchStates.Done) {
          if (context.Index === index) {
            context.Index = index + 1;
          }
          this.LastIndex = context.Index - 1;
          index = context.Index;
          transited = true;
          break;
        }
      }
    }
    if (!transited) {
      this.Default(context, buffer, index, value);
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
    }
  }
} catch (e) {
  if (e instanceof SyntaxException) {
    throw e;
  }
  const start = Math.max(0, index - 1);
  const range = new SourceRange(buffer.Document, start, index + 1);
  throw SyntaxException.FromInner(range, e);
}
```
