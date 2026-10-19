# dependencies
```xl
import { RegexTemplate } from "../../core/syntax/templates/regex-template.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
```

# namespace cangjie

运行层：**TypeScript 这一门语言的模板配置**。

`Template` 是语言无关的规则表；它上面的 `StringTemplate` 描述「字符串长什么样」，默认值沿用 C# 语义（`@` 逐字、`$` 前缀内插、`"""` 原始串）。ts 只有三种引号、没有那三种形态，所以在这里关掉。

`RegexTemplate` 描述 ts 的正则字面量：flags 的字符集与「哪些关键字之后可以直接起表达式」。起点判据本身是词法层的近似（`/` 之前最后一个代码单元），控制头 `)`、裸块 `}` 那一族由语法形状登记 `RegexStartAfter`，不在这里配。

装配点仍然只有一处：`SourceFileRunner` 用本页建模板。

# class TypeScriptRegexTemplate extends RegexTemplate

ts 的正则模板。

**flags 必须按 TS 的 `isIdentifierPart` 收，不能用 ASCII 近似**：TS 的词法在结尾 `/` 之后把连续的 identifier part 都算进 `RegularExpressionLiteral.text`（`/a/xyz` 的 `text` 是 `/a/xyz`、`/a/é` 的 `text` 是 `/a/é`，合法性留给语义检查），而 identifier part 是 Unicode 的（`é` / `日` / astral 字母都算）。只收 ASCII 时 `/a/é;` 会抛「表达式语句没有读完」，产出的 `Text` 也就补不平。

`ID_Continue` 恰好就是「identifier part」的 Unicode 口径；用正则属性转义判定，不依赖 ts 编译器包。

## method IsFlag:(value:string)=>bool

单个字符是不是 TS 眼里的 flag 字符：Unicode identifier part（`\p{ID_Continue}`）。

```ts
return value.length > 0 && /^[\p{ID_Continue}]$/u.test(value);
```

# class TypescriptTemplate

## static method Create:()=>Template

造一份 ts 的模板：装 basic 跳转队列（不装的话 `Bracket` 等取不到队列，括号里的字符一个都收不进来），再把字符串形态与正则形态配成 ts 的样子。

**ts 模板不再禁用 `RegexToken.Transit`**：判据已经换成「跳过 trivia 取 `/` 之前最后一个代码单元、按 token 类型判」，`a / b` / `(a) / b` / `a /* c */ / b` 这些除号不会再被误认成正则（这 89 条除号用例就是判据的回归网）。

```ts
const template = new Template();
template.BranchTemplate.DefaultValue = Template.BasicBranchQueue();
template.SymbolTemplate.AllowCombineSymbol(["**", "**=", "<<", ">>", ">>>", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "%=", "&&=", "||=", "??="]);
template.StringTemplate.Quotes = ['"', "'", "`"];
template.StringTemplate.HasVerbatim = false;
template.StringTemplate.HasInterpolation = false;
template.StringTemplate.HasRaw = false;
template.RegexTemplate = new TypeScriptRegexTemplate();
template.RegexTemplate.ExpressionKeywords = [
  "typeof",
  "void",
  "delete",
  "new",
  "instanceof",
  "in",
  "return",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
];
return template;
```
