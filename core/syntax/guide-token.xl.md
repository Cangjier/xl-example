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

## constructor:(Template:Template)=>void

原 C# 只是转调基类构造器。

```ts
super(Template);
```

## protected method Close:()=>void

关闭：只把自己标记为已关闭。

原 C# 是 `protected override void Close()`。

```ts
this.Closed = true;
```

## protected method Default:(context:SyntaxContext, Src:Source)=>void

兜底处理。

原 C# 的 `Default` 是空实现——引导 token 把所有字符都交给 `Navigate`，不走兜底。按 M30 不写 ts 体。

## protected method Navigate:(context:SyntaxContext, Src:Source)=>void

把当前字符引到目标单元。

原 C# 是 `protected abstract`。

```ts
throw new Error("abstract member: Navigate");
```

## method Process:(Context:SyntaxContext, Src:Source)=>void

处理一个字符：有挂载单元就转给它，否则走 `Navigate`。

原 C# 覆写了基类的调度——引导 token **不跑跳转队列、也不走兜底**。参数名照抄 C# 的 `Context` / `Src`。

```ts
if (this.MountedUnit !== null) {
  this.MountedUnit.Process(Context, Src);
  return;
}
this.Navigate(Context, Src);
this.LastSource = Src;
```
