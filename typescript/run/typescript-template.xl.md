# dependencies
```xl
import { RegexToken } from "../../core/syntax/basic-tokens/regex-token.xl.md"
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
// 这一批用例暂不支持正则字面量（`/a/`），而 `a / b` 里的 `/` 会被正则跳转误认成
// 「前一个 `/` 已经落在树上」——正则跳转按 `Data[-2]` 判，中间隔着空白 token 就判错。
// 先在本语言模板里禁掉正则跳转；等实现正则字面量时再把它放回来并修判据。
template.BranchTemplate.Ban([RegexToken.Transit]);
template.SymbolTemplate.AllowCombineSymbol(["**", "**=", "<<", ">>", ">>>", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "%=", "&&=", "||=", "??="]);
template.StringTemplate.Quotes = ['"', "'", "`"];
template.StringTemplate.HasVerbatim = false;
template.StringTemplate.HasInterpolation = false;
template.StringTemplate.HasRaw = false;
return template;
```
