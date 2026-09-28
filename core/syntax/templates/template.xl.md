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

# type TemplateInitializer = (template:any)=>void

「拿模板做初始化」的委托。

原 C# 侧是 `Action<Template<ValueType>>`。按 M22，参数表里用别名而不是直接写函数类型；`# type` 不支持泛型参数，所以这里写 `any`。按 M26，右侧直接写 ts 语法。

# class Template<ValueType>

模板：一个上下文里所有单元共用的规则表。

原 C# 只有一个无参构造器，五个模板字段都在初值里 `new` 出来。

## field BranchTemplate:SequenceTemplate<Branch<ValueType>> = new SequenceTemplate<Branch<ValueType>>()

跳转模板：按单元类型给出该单元要跑哪些 `Branch`。

## field ReorganizationTemplate:SequenceTemplate<Reorganization<ValueType>> = new SequenceTemplate<Reorganization<ValueType>>()

重组模板：按单元类型给出该单元要跑哪些 `Reorganization`。注释被移出语法树就是这一步做的。

## field SymbolTemplate:SymbolTemplate = new SymbolTemplate()

符号模板。

## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()

关键字模板。

## field MethodNameTemplate:MethodNameTemplate = new MethodNameTemplate()

方法名模板。

## method Initialize:(onInitialize:TemplateInitializer)=>Template<ValueType>

拿自身跑一遍初始化回调，然后返回自身，便于 `new Template<char>().Initialize(...)` 这样链式写。

原 C# 签名是 `Template<ValueType> Initialize(Action<Template<ValueType>> onInitialize)`。

```ts
onInitialize(this);
return this;
```
