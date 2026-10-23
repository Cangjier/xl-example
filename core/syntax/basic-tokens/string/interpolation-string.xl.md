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

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

插值字符串：`{ … }` 这一段本身。它是**单元**（不是向导），括号里的内容由挂载的子单元自己啃；只有那个 `}` 归它管——它把 `}` 转交给 `InterpolationExitGuide` 去数。

没有覆写 `ToXmlString`，XML 由基类 `Token.ToXmlString` 产出：`<InterpolationString>子单元</InterpolationString>`；标签名取类名。

# class InterpolationString extends UnitToken

插值字符串。

## constructor:(template:Template)=>void

创建时按自己的运行时类型取跳转队列。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
```

## property ParentString:String

插值所属的那层字符串——`Parent` 直接就是 `String`。

### get

```ts
return (this.Parent as String)!;
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

兜底：碰上空白字符（`\r` / `\n` / 空格 / `\t`）直接忽略，非空白时同样什么都不做。

```ts
const Value = buffer.At(index);
if (Value === "\r" || Value === "\n" || Value === " " || Value === "\t") {
  return;
}
```

## method ForceExit:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

强制退出：签出到 `index + 1`（半开终点 = 被消费的 `}` 下标 + 1），尝试关闭（关自己并跑重组），再从父单元卸载自己。

```ts
this.SignOut(index + 1);
this.TryToClose(context);
this.Quit();
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理窗口里的字符，直到窗口走完**或本单元已经关闭**。

退出向导数够 `}` 时会 `ForceExit` 本单元（`Closed = true`、从外层字符串卸载）。基类 `UnitToken.Process` 的窗口循环没有「本单元已关闭」这个退出条件，关闭之后它还会继续把同一窗口剩下的字符吃进本单元；这里用与基类相同的循环，只补一条 `!this.Closed` 守卫：退出之后立刻把窗口交还出去，`}` 之后的字符回到外层字符串。

```ts
try {
  while (index < buffer.End && !this.Closed) {
    if (this.MountedUnit !== null) {
      this.MountedUnit.Process(context, buffer, index);
      if (context.Index === index) {
        return;
      }
      this.LastIndex = context.Index - 1;
      index = context.Index;
      continue;
    }
    const exitState = this.ExitOrPre(context, buffer, index);
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
      for (const item of this.ProcessQueue.Data) {
        const state = item(context, this, buffer, index);
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
      this.Default(context, buffer, index);
      if (context.Index === index) {
        context.Index = index + 1;
      }
      this.LastIndex = index;
      index = context.Index;
    }
  }
} catch (e) {
  const start = Math.max(0, index - 1);
  const range = new SourceRange(buffer.Document, start, index + 1);
  throw SyntaxException.FromInner(range, e);
}
```

## protected method ExitOrPre:(context:SyntaxContext, buffer:SourceRange, index:int)=>BranchStates

遇到 `}` 就把退出向导挂到自己身上；当前这个 `}` 还没被消费，所以返回 `Reload`——`UnitToken.Process` 会压一条 `ReloadMessage` 并原地阻塞，由驱动层重放，重放时 `MountedUnit`（向导）接住这个 `}`。

```ts
if (buffer.At(index) === "}") {
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
