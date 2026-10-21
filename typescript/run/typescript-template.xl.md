# dependencies
```xl
import { RegexTemplate } from "../../core/syntax/templates/regex-template.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { Bracket } from "../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../core/syntax/basic-tokens/common.xl.md"
import { Symbol } from "../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
```

# namespace cangjie

运行层：**TypeScript 这一门语言的模板配置**。

`Template` 是语言无关的规则表；**默认值本身就是 ts 的字符串形式**（三种引号、没有逐字串 / 原始串 / 前缀式内插；引号内内插打开、只认反引号），所以这里不再覆盖 `StringTemplate`。`StringGuide` 会把反引号串标成 `IsSupportInterpolation=True`、`InterpolationCount=1`，`String` 在串内按 `${…}` 收内插——词法层已通；模板的 AST 还要等形状层（用例见 `typescript/cases/string.ts`）。

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

## method CanStartAt:(units:Array<Token>, index:int)=>bool

ts 的起点判据：先走 `RegexTemplate.CanStartAt` 的纯词法判据，再补三类**位置判据**——词法层只看到「前一个代码单元」时判不出来的那些语句起点。

- 控制头 `)`：`if (a)` / `while (a)` / `for (;;)` / `with (a)` 的 `)` 之后一定是新语句；
  `obj.while(a)` / `obj.if(a)` 这种**成员调用**不算（`(` 前面那个词之前的单元是 `.` / `?.`）。
- `else` / `do` 关键字尾：`else /re/` / `do /re/`。
- 语句块尾：`try { } catch (e) { } ` 之后这类**块语句的收尾**；值位的花括号
  （`=` / `=>` / `(` / `,` / `:` 之后的对象字面量、函数/类**表达式**的体）一律排除。

```ts
if (super.CanStartAt(units, index)) {
  return true;
}
const slashIndex = TypeScriptRegexTemplate.SlashIndex(units, index);
if (slashIndex < 0) {
  return false;
}
const lastIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, slashIndex - 1);
if (lastIndex < 0) {
  return false;
}
const last = units[lastIndex];
if (last instanceof Bracket && (last as Bracket).StartBracketChar === "(") {
  const headIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, lastIndex - 1);
  if (headIndex >= 0) {
    const head = units[headIndex];
    if (head instanceof Common) {
      const word = (head as Common).TempToString();
      if (word === "if" || word === "while" || word === "for" || word === "with") {
        const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, headIndex - 1);
        const before = beforeIndex >= 0 ? units[beforeIndex] : null;
        if (before === null || !(before instanceof Symbol)) {
          return true;
        }
        const beforeText = (before as Symbol).TempToString();
        if (beforeText !== "." && beforeText !== "?.") {
          return true;
        }
      }
    }
  }
}
if (last instanceof Common) {
  const tail = (last as Common).TempToString();
  if (tail === "else" || tail === "do") {
    return true;
  }
}
if (last instanceof Bracket && (last as Bracket).StartBracketChar === "{") {
  // 箭头函数体 `() => { }` 之后换行再 `/`：TS 一定断句（箭头体的 `}` 后不能接二元运算），
  // 该 `/` 是新语句的正则起点（r1231）。对象字面量 / `function` 表达式体仍走原判据
  //（它们后面跟 `/` 可能是除号：`const o = {} / 2` / `const f = function () {} / 2` 都是除法）。
  const braceBeforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, lastIndex - 1);
  if (braceBeforeIndex >= 0) {
    const braceBefore = units[braceBeforeIndex];
    if (braceBefore instanceof Symbol && (braceBefore as Symbol).Is("=>")
      && TypeScriptRegexTemplate.HasLineBreakBetween(last, units[slashIndex])) {
      return true;
    }
  }
  return TypeScriptRegexTemplate.IsStatementBraceTail(units, lastIndex);
}
return false;
```

## static method PreviousCodeIndex:(units:Array<Token>, fromIndex:int)=>int

从 `fromIndex` 往前跳过 trivia，返回第一个代码单元的下标；没有则返回 `-1`。

```ts
let at = fromIndex;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
return at;
```

## static method HasLineBreakBetween:(left:Token, right:Token)=>bool

两个代码单元的原文之间有没有换行（块注释里的换行也算）。

```ts
const from = left.SourceRange.End;
const to = right.SourceRange.Start;
if (from === null || to === null) {
  return false;
}
const document = from.Document;
let cursor = from.Index + 1;
while (cursor < to.Index) {
  const ch = document.At(cursor).Value;
  if (ch === "\n" || ch === "\r") {
    return true;
  }
  cursor++;
}
return false;
```

## static method SlashIndex:(units:Array<Token>, index:int)=>int

`index` 是 `/` 之后的下标（`data.length`）；往前跳过 trivia 找到那个 `/` 单元并返回它的下标，找不到返回 `-1`。

```ts
let at = index - 1;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
if (at < 0) {
  return -1;
}
const unit = units[at];
if (unit instanceof Symbol && (unit as Symbol).Is("/")) {
  return at;
}
return -1;
```

## static method IsStatementBraceTail:(units:Array<Token>, braceIndex:int)=>bool

判断 `braceIndex` 这个 `{` 是不是**块语句的收尾**（而不是值位的对象字面量 / 函数表达式体）。
先排除值位（`=` / `=>` / `(` / `,` / `:` 等），再回看构造头：`try` / `catch` / `finally` / `else` / `do`，
或 `if` / `while` / `for` / `with` / `switch`（这类要先跳过条件括号）。

```ts
const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, braceIndex - 1);
if (beforeIndex < 0) {
  return true;
}
const before = units[beforeIndex];
if (before instanceof Symbol) {
  const text = (before as Symbol).TempToString();
  if (text === "." || text === "?." || text === "=" || text === "=>" || text === "(" || text === "[" || text === "," || text === ":" || text === "?" || text === "||" || text === "&&" || text === "+" || text === "-" || text === "*" || text === "/" || text === "%" || text === "!" || text === "~" || text === "&" || text === "|" || text === "^" || text === "<" || text === ">" || text === "==" || text === "===" || text === "!=" || text === "!==") {
    return false;
  }
}
let headIndex = beforeIndex;
if (before instanceof Bracket && (before as Bracket).StartBracketChar === "(") {
  headIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, beforeIndex - 1);
}
if (headIndex < 0) {
  return false;
}
const head = units[headIndex];
if (!(head instanceof Common)) {
  return false;
}
const word = (head as Common).TempToString();
if (word === "try" || word === "catch" || word === "finally" || word === "else" || word === "do") {
  return true;
}
if (word === "if" || word === "while" || word === "for" || word === "with" || word === "switch") {
  return true;
}
return false;
```

# class TypescriptTemplate

## static method Create:()=>Template

造一份 ts 的模板：装 basic 跳转队列（不装的话 `Bracket` 等取不到队列，括号里的字符一个都收不进来），再把符号组合、数字后缀与正则形态配成 ts 的样子。字符串形态直接吃 `StringTemplate` 的默认值（= ts），不再逐项覆盖。

**ts 模板不再禁用 `RegexToken.Transit`**：判据已经换成「跳过 trivia 取 `/` 之前最后一个代码单元、按 token 类型判」，`a / b` / `(a) / b` / `a /* c */ / b` 这些除号不会再被误认成正则（这 89 条除号用例就是判据的回归网）。

**数字后缀**：ts 的数字字面量没有 `d` / `f` / `m` / `l` / `u` 这类普通后缀，`PlainSuffixes` 保持空；唯一的后缀是 BigInt 的 `n`。`_` 已经从 core 的符号表里移除，所以 `1_000`、`a_b` 都归 `Common`。

**`default` 也是表达式关键字**：`export default /re/;` 里 `default` 后面直接跟正则；
少这一项时 `/` 会被当成除号（`export default /re/;` 抛「不支持的表达式起点」）。

```ts
const template = new Template();
template.BranchTemplate.DefaultValue = Template.BasicBranchQueue();
template.SymbolTemplate.AllowCombineSymbol(["**", "**=", "<<", ">>", ">>>", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "%=", "&&=", "||=", "??="]);
template.NumberTemplate.BigIntSuffix = "n";
template.SymbolTemplate.SupportUnicodeEscapeIdentifier = true;
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
  "default",
  "yield",
  "await",
];
return template;
```
