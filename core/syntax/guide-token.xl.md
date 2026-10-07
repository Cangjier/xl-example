# dependencies
```xl
import { PendingSources } from "./pending-sources.xl.md"
import { Source } from "./source.xl.md"
import { SyntaxContext } from "./syntax-context.xl.md"
import { Token } from "./token.xl.md"
import { Template } from "./templates/template.xl.md"
```

# namespace cangjie

Cangjie 的语法层：把源码字符流组织成 token 树，再由树产出 XML。

引导 token：不自己持有字符，只负责把后续字符**引到别的单元**去。字符串引号、插值引号、正则分隔符都是它。

# class GuideToken extends Token

引导。

## field Pending:PendingSources = new PendingSources()

**位置缓冲——形状还不明朗时先攒着的那一批字符。**

这是引导 token 这一类东西的**标配字段**（用户口径：`PendingSources` 应该是 `GuideToken` 的字段，
用于当形状不明朗时先缓存）✓。任何向导都会遇到同一个局面：

> 这几个字符**必须归某个单元**，可那个单元此刻还**不该**建出来（形状还没定），
> 或者还**不知道**该不该建。

这时向导不该自己发明一个数组 ✓，而是把它们记进 `this.Pending` ✓，等形状定了再从两个出口里挑一个：

- **`CommitTo(context, unit)`** ✓——形状定了，这批位置归刚建出来的那个单元，
  按序喂给它（喂完自动清空 ✓）；
- **`GiveBackTo(context, owner)`** ✓——形状定了，发现这批**不归自己**，
  按序交还给外层单元（它们本来就该是外层的东西 ✓）。

**攒本身没有价值，两个出口才是** ✓。而且这条路是**有界**的 ✓：攒的是「形状待定的那一小段」
（一个词、一段 trivia、一段前缀 ✓），不是「整条语句」✗——
把整条语句攒成一张平列表再跑算法，那正是 `Reorganization` 的形状 ✗。

`PendingSources` 自己只负责**记位置**与**把位置原样送出去** ✓，不认识「我是谁的缓冲」这类身份，
也不判断形状 ✓：判定归向导，缓冲归它 ✓。

## constructor:(Template:Template)=>void

以模板创建。参数名 `Template` 与类型名 `Template` 同名，这里沿用。

```ts
super(Template);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, Src:Source)=>void

兜底处理。

引导 token 把所有字符都交给 `Navigate`，不走兜底，所以不写 ts 体。

## protected method Navigate:(context:SyntaxContext, Src:Source)=>void

把当前字符引到目标单元。

抽象方法，由各引导 token 实现。

```ts
throw new Error("abstract member: Navigate");
```

## method Process:(Context:SyntaxContext, Src:Source)=>void

处理一个字符：有挂载单元就转给它，否则走 `Navigate`。

引导 token 覆写了基类的调度：**不跑跳转队列、也不走兜底**。参数名沿用 `Context` / `Src`。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(Context, Src);
  return;
}
this.Navigate(Context, Src);
this.LastSource = Src;
```
