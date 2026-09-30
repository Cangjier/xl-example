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
