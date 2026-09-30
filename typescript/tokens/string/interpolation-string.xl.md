# dependencies
```xl
import { UnitToken } from "../../../core/syntax/unit-token.xl.md"
import { BranchStates } from "../../../core/syntax/branch-states.xl.md"
import { Source } from "../../../core/syntax/source.xl.md"
import { SyntaxContext } from "../../../core/syntax/syntax-context.xl.md"
import { Token } from "../../../core/syntax/token.xl.md"
import { Template } from "../../../core/syntax/templates/template.xl.md"
import { ReloadMessage } from "../../../core/syntax/messages/reload-message.xl.md"
import { InterpolationExitGuide } from "./interpolation-exit-guide.xl.md"
import { String } from "./string.xl.md"
```

# namespace cangjie

`typescript`：把一段源码字符串包成语法层能读的文档，并驱动 token 树把它啃成 XML。

插值字符串：`{ … }` 这一段本身。它是**单元**（不是向导），括号里的内容由挂载的子单元自己啃；只有那个 `}` 归它管——它把 `}` 转交给 `InterpolationExitGuide` 去数。

它的 XML 由基类 `Token.ToXmlString` 产出：`<InterpolationString>子单元</InterpolationString>`（它没有覆写 `ToXmlString`），所以类名必须正好是 `InterpolationString`，否则 XML 标签名就变了。

# class InterpolationString extends UnitToken

插值字符串。

## constructor:(template:Template)=>void

创建时按自己的运行时类型取跳转队列与重组队列：用 `this.constructor` 去模板上查（`SequenceTemplate` 以**构造器对象**为键做派发）。

```ts
super(template);
this.ProcessQueue = template.BranchTemplate.Get(this.constructor);
this.ReorganizationQueue = template.ReorganizationTemplate.Get(this.constructor);
```

## property ParentString:String

插值所属的那层字符串——`Parent` 直接就是 `String`。

### get

```ts
return (this.Parent as String)!;
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, source:Source)=>void

兜底：碰上空白字符（`\r` / `\n` / 空格 / `\t`）直接忽略，非空白时同样什么都不做。

```ts
const Value = source.Value;
if (Value === "\r" || Value === "\n" || Value === " " || Value === "\t") {
  return;
}
```

## method ForceExit:(context:SyntaxContext, source:Source)=>void

强制退出：签出到 `source`，尝试关闭（关自己并跑重组），再从父单元卸载自己。

注意它**没有**用 `context`，参数只是为了给 `InterpolationExitGuide` 一个统一调用形态。同名的 `String.ForceExit` 只收一个参数，别混。

```ts
this.SignOut(source);
this.TryToClose();
this.Quit();
```

## protected method ExitOrPre:(context:SyntaxContext, source:Source)=>BranchStates

遇到 `}` 就把退出向导挂到自己身上，并把当前 `}` 重新插回队首，让向导拿到它。

注意 `AddToMounted` 之后**没有** `SignIn`（与 `String.Default` 里的用法不同）。

```ts
if (source.Value === "}") {
  this.AddToMounted(new InterpolationExitGuide(this.Template));
  context.Messages.push(ReloadMessage.WithoutProcessOwner(this, source));
  return BranchStates.Done;
}
return BranchStates.Undo;
```

## method Clone:()=>Token

克隆自身：`Sign(this)` → `AddRange(Data.map(...))` → `TryToClose()`。`AddRange` 传的是一批克隆出来的子单元。

```ts
const result = new InterpolationString(this.Template);
result.Sign(this);
result.AddRange(this.Data.map((item) => item.Clone()));
result.TryToClose();
return result;
```
