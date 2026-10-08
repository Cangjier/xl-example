# dependencies
```xl
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

**它没有「位置缓冲」这个字段**（第 405 轮删掉了 `PendingSources`，用户口径：「先移除 `PendingSources`」）。
原先那个字段是给「形状不明朗时先攒一批位置、之后再重放/交还」准备的——
但真到 `if` 上就发现**不必攒**：尾巴上的字符让**通用跳转队列**照常词法化就行，
`else` 本来就会被造成一个 `Identifier`（判据是「它是不是一个关上的 `else`」），
于是既没有「重放」也没有「交还」，那个缓冲连同它的三个出口一起没有了用户。
**攒本身没有价值**；真需要时再谈。

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
