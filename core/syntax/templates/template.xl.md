# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { AreaAnnotation } from "../basic-tokens/area-annotation.xl.md"
import { Bracket } from "../basic-tokens/bracket.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { LineAnnotation } from "../basic-tokens/line-annotation.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { KeywordTemplate } from "./keyword-template.xl.md"
import { MethodNameTemplate } from "./method-name-template.xl.md"
import { Sequence } from "./sequence.xl.md"
import { SequenceTemplate } from "./sequence-template.xl.md"
import { SymbolTemplate } from "./symbol-template.xl.md"
```

# namespace cangjie

模板层：每个单元（token）的跳转规则都从 `Template` 上取。

一个 `Template` 实例就是一套语言配置，`TextContext` 构造时把它交给 `Root`。

# type TemplateInitializer = (template:Template)=>void

「拿模板做初始化」的委托。

参数表里用别名而不是直接写函数类型；别名右侧直接写 ts 语法。

# class Template

模板：一个上下文里所有单元共用的规则表。

四个模板字段都在初值里 `new` 出来。

## field BranchTemplate:SequenceTemplate<Branch> = new SequenceTemplate<Branch>()

跳转模板：按单元类型给出该单元要跑哪些 `Branch`。

## field SymbolTemplate:SymbolTemplate = new SymbolTemplate()

符号模板。

## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()

关键字模板。

## field MethodNameTemplate:MethodNameTemplate = new MethodNameTemplate()

方法名模板。

## private static field BasicBranchQueueCache:Sequence<Branch> | null = null

`BasicBranchQueue` 的缓存；`null` 表示还没建过。

## static method BasicBranchQueue:()=>Sequence<Branch>

basic tokens 的跳转队列：相对顺序与通用队列一致——注释 → 正则 → 括号 → 符号 → 通用字符。

**`Symbol` 必须排在 `Common` 之前、`Bracket` 之后**：标点只归符号块，而三个开括号已经被 `Bracket` 认领完了，再问符号块才轮得到 `;` / `"` / `=` 这些；反过来把 `Symbol` 放在 `Bracket` 前面，`(` 会先被当成单字符符号。

**为什么是方法而不是 static 字段。** 模板与 basic tokens 互为依赖（模板要列出它们的分支，它们的构造器要问模板要自己的队列），写成类定义期求值的 `static readonly field` 会读到 `undefined`——require 环里先执行的那一半还没把类定义出来。改成方法 + 缓存之后，那 6 个静态分支实例只在第一次调用时才读，那时所有模块都已加载完。

```ts
if (Template.BasicBranchQueueCache === null) {
  Template.BasicBranchQueueCache = new Sequence<Branch>([AreaAnnotation.JumpIn, LineAnnotation.JumpIn, RegexToken.JumpIn, Bracket.JumpIn, Symbol.AppendIn, Common.AppendIn]);
}
return Template.BasicBranchQueueCache;
```

## method Initialize:(onInitialize:TemplateInitializer)=>Template

拿自身跑一遍初始化回调，然后返回自身，便于链式写。

```ts
onInitialize(this);
return this;
```
