# dependencies
```xl
import { Template } from "../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

运行层：**TypeScript 这一门语言的模板配置**。

`Template` 是语言无关的规则表；它上面的 `StringTemplate` 描述「字符串长什么样」，默认值沿用 C# 语义（`@` 逐字、`$` 前缀内插、`"""` 原始串）。ts 只有三种引号、没有那三种形态，所以在这里关掉。

装配点仍然只有一处：`SourceFileRunner` 用本页建模板。

# class TypescriptTemplate

## static method Create:()=>Template

造一份 ts 的模板：装 basic 跳转队列（不装的话 `Bracket` 等取不到队列，括号里的字符一个都收不进来），再把字符串形态配成 ts 的样子。

```ts
const template = new Template();
template.BranchTemplate.DefaultValue = Template.BasicBranchQueue();
template.StringTemplate.Quotes = ['"', "'", "`"];
template.StringTemplate.HasVerbatim = false;
template.StringTemplate.HasInterpolation = false;
template.StringTemplate.HasRaw = false;
return template;
```
