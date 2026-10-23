# dependencies
```xl
import { CloseStates } from "./close-states.xl.md"
import { SourceRange } from "./source-range.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

引导 token：不自己持有字符，只负责把后续字符**引到别的单元**去。字符串引号、插值引号、正则分隔符都是它。

# class GuideToken extends Token

引导。

## constructor:(Template:Template)=>void

以模板创建。参数名 `Template` 与类型名 `Template` 同名，这里沿用。

```ts
super(Template);
```

## protected method Close:(context:SyntaxContext)=>CloseStates

关闭：只把自己标记为已关闭，返回 `Nothing`。

```ts
this.Closed = true;
return CloseStates.Nothing;
```

## protected method Default:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

兜底处理。

引导 token 把所有字符都交给 `Navigate`，不走兜底，所以不写 ts 体。

## protected method Navigate:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

把当前字符引到目标单元。

抽象方法，由各引导 token 实现。它**自己负责推进**：消费了当前字符就推进 `context.Index`；把当前字符 `ReloadMessage` 交回去重放时不推进（保持阻塞）。

```ts
throw new Error("abstract member: Navigate");
```

## method Process:(context:SyntaxContext, buffer:SourceRange, index:int)=>void

处理窗口里 `index` 处的一个字符：有挂载单元就整个转给它，否则走 `Navigate`。

引导 token 覆写了基类的调度：**不跑跳转队列、也不走兜底**。

`Navigate` 之后按三种情况收口：

1. `context.Index` 已经前进——`Navigate` 自己推进过，记下 `LastIndex` 返回；
2. `context.Index` 没动、但这次 `Navigate` 压了消息（`ReloadMessage`）——当前字符没被消费，**保持阻塞返回**，由驱动层重放；
3. `context.Index` 没动、也没有消息——`Navigate` 消费了字符但没推进游标（只做了签入签出），统一补 `+1`。

**无进展即阻塞返回**：情况 2 不推进，驱动层的无进展保护负责兜底。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(context, buffer, index);
  if (context.Index > index) {
    this.LastIndex = index;
  }
  return;
}
const messageCount = context.Messages.length;
this.Navigate(context, buffer, index);
if (context.Index > index) {
  this.LastIndex = index;
  return;
}
if (context.Messages.length > messageCount) {
  return;
}
context.Index = index + 1;
this.LastIndex = index;
```
