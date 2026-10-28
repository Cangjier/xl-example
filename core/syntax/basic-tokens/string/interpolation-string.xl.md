# dependencies
```xl
import { UnitToken } from "../../unit-token.xl.md"
import { BranchStates } from "../../branch-states.xl.md"
import { CloseStates } from "../../close-states.xl.md"
import { ReloadMessage } from "../../messages/reload-message.xl.md"
import { SourceRange } from "../../source-range.xl.md"
import { SyntaxContext } from "../../syntax-context.xl.md"
import { Token } from "../../token.xl.md"
import { Template } from "../../templates/template.xl.md"
import { SyntaxException } from "../../../exceptions/syntax-exception.xl.md"
import { InterpolationExitGuide } from "./interpolation-exit-guide.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

# class InterpolationString extends UnitToken

## constructor:(template:Template)=>void

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## property ParentString:String

### get

```ts
return (this.Parent as String)!;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>void

```ts
if (value === "\r" || value === "\n" || value === " " || value === "\t") {
  return;
}
```

## method ForceExit:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
this.SignOut(index + 1);
this.TryToClose(context);
this.Quit();
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

```ts
try {
  while (index < buffer.End && !this.Closed) {
    if (this.Parent !== null && this.Parent.MountedUnit !== this) {
      return;
    }
    if (!context.Replaying && context.Messages.length > 0) {
      return;
    }
    if (this.MountedUnit !== null) {
      this.MountedUnit.Process(context, buffer, index);
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
    if (this.ProcessQueue !== null) {
      // 与基类同一口径：当前字符只读一次，顺链传给每条跳转。
      for (const item of this.ProcessQueue.Data) {
        const state = item(context, this, buffer, index, value);
        if (state === BranchStates.Reload) {
          context.Messages.push(new ReloadMessage(null, index));
          return;
        }
        if (state === BranchStates.Done) {
          if (context.Index === index) {
            context.Index = index + 1;
          }
          this.LastIndex = index;
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

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int, value:string)=>BranchStates

```ts
if (value === "}") {
  {
    const lastOfMounted = this.Last();
    if (lastOfMounted !== null && !lastOfMounted.Closed) {
      lastOfMounted.TryToClose(context);
    }
    const mounted = new InterpolationExitGuide(this.Template);
    this.Add(mounted);
    this.MountedUnit = mounted;
  }
  return BranchStates.Reload;
}
return BranchStates.Undo;
```
