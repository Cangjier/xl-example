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

## field CloseRuleTemplate:SequenceTemplate<Reorganization> = new SequenceTemplate<Reorganization>()

收尾规则模板：按单元类型给出该单元关闭之后要跑哪些规则（`Reorganization` 那一族）。

**名字里的「重组」已经摘掉** ✓（第 562 轮 ✓）：它从前是「全局重组那一趟」的输入表 ✓，
那一趟在第 561 轮删掉之后 ✓，这张表只剩 `Token.ApplyCloseRules` 这一个读点 ✓
（`DefaultValue` 装的是通用那一份 ✓，见 `../token.xl.md` ✓）。
装在这里的规则**会进产物**：注释单元留在树里（`AreaAnnotation` / `LineAnnotation` 的
摘除规则早就不在队里了 ✓，见 `typescript/parse-pipeline.xl.md` ✓）。

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
