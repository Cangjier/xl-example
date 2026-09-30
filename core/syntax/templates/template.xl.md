# dependencies
```xl
import { Branch } from "../branch.xl.md"
import { Reorganization } from "../reorganization.xl.md"
import { KeywordTemplate } from "./keyword-template.xl.md"
import { MethodNameTemplate } from "./method-name-template.xl.md"
import { SequenceTemplate } from "./sequence-template.xl.md"
import { SymbolTemplate } from "./symbol-template.xl.md"
```

# namespace cangjie

模板层：每个单元（token）的跳转与重组规则都从 `Template` 上取。

一个 `Template` 实例就是一套语言配置，`TextContext` 构造时把它交给 `Root`。

# type TemplateInitializer = (template:Template)=>void

「拿模板做初始化」的委托。

参数表里用别名而不是直接写函数类型；别名右侧直接写 ts 语法。

# class Template

模板：一个上下文里所有单元共用的规则表。

五个模板字段都在初值里 `new` 出来。

## field BranchTemplate:SequenceTemplate<Branch> = new SequenceTemplate<Branch>()

跳转模板：按单元类型给出该单元要跑哪些 `Branch`。

## field ReorganizationTemplate:SequenceTemplate<Reorganization> = new SequenceTemplate<Reorganization>()

重组模板：按单元类型给出该单元要跑哪些 `Reorganization`。注释被移出语法树就是这一步做的。

## field SymbolTemplate:SymbolTemplate = new SymbolTemplate()

符号模板。

## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()

关键字模板。

## field MethodNameTemplate:MethodNameTemplate = new MethodNameTemplate()

方法名模板。

## method Initialize:(onInitialize:TemplateInitializer)=>Template

拿自身跑一遍初始化回调，然后返回自身，便于链式写。

```ts
onInitialize(this);
return this;
```
