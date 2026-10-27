# dependencies
```xl
import { RegexTemplate } from "../../core/syntax/templates/regex-template.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { TypeScriptSymbolTemplate } from "./typescript-symbol-template.xl.md"
import { Bracket } from "../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../core/syntax/basic-tokens/common.xl.md"
import { RegexToken } from "../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { LineTerminator } from "./line-terminator.xl.md"
import { ExpressionAtomRegistry } from "../tokens/expressions/forms/shared/expression-atom-registry.xl.md"
```

# namespace cangjie

运行层：**TypeScript 这一门语言的模板配置**。

`Template` 是语言无关的规则表；**默认值本身就是 ts 的字符串形式**（三种引号、没有逐字串 / 原始串 / 前缀式内插；引号内内插打开、只认反引号），所以这里不再逐项覆盖 `StringTemplate` 的引号 / 逐字 / 原始串配置。`StringGuide` 会把反引号串标成 `IsSupportInterpolation=True`、`InterpolationCount=1`，`String` 在串内按 `${…}` 收内插——词法层已通；模板的 AST 还要等形状层（用例见 `typescript/cases/astjson/string.ts`）。

**三个扫描细节按 ECMAScript 覆盖**（core 的默认值是既有行为，ts 才收紧/放开）：

- `StringTemplate.LineTerminatorChars` 加上 `\u2028` / `\u2029`：ECMAScript 的行续接是 `\` + LineTerminatorSequence，
  而 LineTerminatorSequence 包括 LS / PS（`"a\<U+2028>b"` 的 cooked 是 `"ab"`）；
- `StringTemplate.StrictTemplateEscapes = true`：模板串里的 legacy octal（`\1`–`\7`、`\00`）与
  NonOctalDecimalEscape（`\8` / `\9`）是非法转义——**带标签模板**里它们的 cooked 是 `undefined`、
  AST 的 `text` 取原文（`` tag`\8` `` → `text` 是 `\8`）。不带标签模板里这些转义是语法错误（ts 有诊断、不入尺子），
  这里按「超集」口径统一产出原文（见 `docs/Final.md`）。
- `StringTemplate.AllowLongUnicodeBraceEscape = true`：`\u{…}` **位数不限**（前导零任意多），
  只受 Unicode 标量上限 `U+10FFFF` 约束——`"\u{0000061}"` 的 cooked 是 `"a"`、`"\u{000000000010FFFF}"`
  是 `U+10FFFF`（代理对）。core 的默认值是历史行为（6 位上限、第 7 位起按原文），
  与标识符路径的 `SymbolTemplate.SupportUnicodeEscapeIdentifier` 同一套「逐位累计、越界即非法」口径
  （共用 `Common.MaxUnicodeCodePoint`，见 `docs/Final.md`）。

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

ts 的起点判据，**除号优先**：`/` 之前那个实义单元只要**能结束一个表达式**（`CanEndOperand`），
这个 `/` 就是除号，直接否决——不再看词法默认判据。

判不出来时才走 `RegexTemplate.CanStartAt` 的纯词法判据，再补三类**位置判据**——词法层只看到
「前一个代码单元」时判不出来的那些语句起点：

- 控制头 `)`：`if (a)` / `while (a)` / `for (;;)` / `with (a)` 的 `)` 之后一定是新语句；
  `obj.while(a)` / `obj.if(a)` 这种**成员调用**不算（`(` 前面那个词之前的单元是 `.` / `?.`）。
- `else` / `do` 关键字尾：`else /re/` / `do /re/`。
- 语句块尾：`try { } catch (e) { } ` 之后这类**块语句的收尾**；值位的花括号
  （`=` / `=>` / `(` / `,` / `:` 之后的对象字面量、函数/类**表达式**的体）一律排除。
  箭头函数体 `() => { }` 之后换行再 `/` 也算。

**为什么必须先判操作数**：`RegexTemplate.CanStart` 把「不是 basic token 的最后一个代码单元」
当语句边界（下一格必然是新语句 ⇒ 起正则）。这只对**语句形状**成立；关闭格上已经建出来的
**操作数形状**（`NumericLiteralShape` / `BinaryExpressionShape` / `CallExpressionShape` / 容器…）
是**已结束的操作数**，不是语句边界。判错的代价是整个 `/` 起的右半条表达式被吃进 `RegexToken`
（`0b1010/*c*/ / 1_000 / 10n` 的声明在注释处收口；`const z = f() / 2 / 3` 丢第二个 `BinaryExpression`）。

判据链只有这一条：

1. `CanEndOperand(units, lastIndex, slashIndex)` ⇒ 除号；
2. `super.CanStartAt` ⇒ 正则（标识符 / 数字 / 字面量 / `)` / `]` / 值位 `}` 的除号已被第 1 步截住）；
3. 位置判据（控制头 `)` / `else` `do` / 块语句尾 `}` / 箭头体 `}` 换行）⇒ 正则。

`PreviousCodeIndex` 跳过**全部 trivia**（空白 / `//` / `/* */` / 软换行 / `AreaAnnotation` /
`LineAnnotation` / `WrapSymbol`），所以 `x/*c*/ / 2`、`x // c\n/ 2`、`0b1010/*c*/ / 1_000 / 10n`
走的是同一条判据，没有「只修注释一种 trivia」的分支。

```ts
const slashIndex = TypeScriptRegexTemplate.SlashIndex(units, index);
if (slashIndex >= 0) {
  const lastIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, slashIndex - 1);
  if (lastIndex >= 0 && this.CanEndOperand(units, lastIndex, slashIndex)) {
    return false;
  }
}
if (super.CanStartAt(units, index)) {
  return true;
}
if (slashIndex < 0) {
  return false;
}
const lastIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, slashIndex - 1);
if (lastIndex < 0) {
  return false;
}
const last = units[lastIndex];
if (last instanceof Bracket && (last as Bracket).StartBracketChar === "("
  && TypeScriptRegexTemplate.IsControlHeadTail(units, lastIndex)) {
  return true;
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
  if (TypeScriptRegexTemplate.IsArrowBodyTail(units, lastIndex, slashIndex)) {
    return true;
  }
  return TypeScriptRegexTemplate.IsStatementBraceTail(units, lastIndex);
}
return false;
```

## method CanEndOperand:(units:Array<Token>, unitIndex:int, slashIndex:int)=>bool

`unitIndex` 这个实义单元**能不能结束一个表达式**：能 ⇒ 它后面的 `/` 是除号。

判据按 token 类型分派，不按「谁是谁的前一个」分派：

- `String` / `RegexToken`：字符串、模板字面量、正则字面量本身就是操作数 ⇒ 除号。
- `Bracket`：`)` 要看它是不是控制头（`IsControlHeadTail`；是 ⇒ 后面起新语句 ⇒ 正则），
  `]` 总是操作数尾（`[1,2] / 2` / `a[0] / 2`），`}` 先排除块语句尾与箭头体
  （`IsStatementBraceTail` / `IsArrowBodyTail`；是 ⇒ 正则），其余（对象字面量 / 函数表达式体）⇒ 除号。
- `Common`：`ExpressionKeywords`（`return` / `throw` / `case` / `typeof` / `new` / `delete` /
  `void` / `in` / `instanceof` / `do` / `else` …）不是操作数；其余都是——标识符、数字
  （含 BigInt 后缀 `n` 与分隔符 `_`）、`this` / `super` / `true` / `false` / `null`。
- `Symbol`：只有**后缀** `++` / `--` 能结束操作数——按「再前一个实义单元是不是操作数」判前缀 / 后缀
  （`i++ / 2` 是除号，`++i / 2` 的 `/` 前面是 `i`，本来就走 `Common` 那一格）。其余符号
  （`=` / `(` / `,` / `:` / `=>` / `?` / `&&` / `||` / `!` / 二元运算符…）一律不是操作数尾 ⇒ 正则。
- 非 basic token（已建形状）：`IsOperandShape` 为真是操作数 ⇒ 除号；语句形状（`TryStatementShape`
  这类）⇒ 继续走 `super` 的「语句边界 ⇒ 正则」。

`as` / `satisfies` 不在 `ExpressionKeywords` 里：两者都是**二元**位置（`a as T` / `a satisfies T`），
`/` 紧跟其后在合法 TS 里不会出现（右边要的是类型 / 表达式），归到「非操作数」不影响任何合法输入。

```ts
const unit = unitIndex >= 0 ? units[unitIndex] : null;
if (unit === null) {
  return false;
}
if (unit instanceof String || unit instanceof RegexToken) {
  return true;
}
if (unit instanceof Bracket) {
  const start = (unit as Bracket).StartBracketChar;
  if (start === ")") {
    return !TypeScriptRegexTemplate.IsControlHeadTail(units, unitIndex);
  }
  if (start === "]") {
    return true;
  }
  if (start === "}") {
    if (TypeScriptRegexTemplate.IsStatementBraceTail(units, unitIndex)) {
      return false;
    }
    if (TypeScriptRegexTemplate.IsArrowBodyTail(units, unitIndex, slashIndex)) {
      return false;
    }
    return true;
  }
  return false;
}
if (unit instanceof Common) {
  return !this.ExpressionKeywords.includes((unit as Common).TempToString());
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text !== "++" && text !== "--") {
    return false;
  }
  const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, unitIndex - 1);
  return beforeIndex >= 0 && this.CanEndOperand(units, beforeIndex, -1);
}
if (!unit.IsBasicToken) {
  return TypeScriptRegexTemplate.IsOperandShape(unit);
}
return false;
```

## static method IsOperandShape:(unit:Token)=>bool

已建形状里**哪些是表达式（操作数）**。判据是形状自己的身份，不看它在谁下面：

- 容器身份表（`ExpressionAtomRegistry.Containers`）里的四种容器形状——这是 K1 的所有权判据，
  开关关闭时恒空，但名字规则本身仍然兜得住它们；
- `…ExpressionShape`（`BinaryExpressionShape` / `CallExpressionShape` / `ParenthesizedExpressionShape` /
  `ObjectLiteralExpressionShape` / `ArrayLiteralExpressionShape` / `PropertyAccessExpressionShape` …）；
- `…LiteralShape`（`NumericLiteralShape` / `BigIntLiteralShape` / `StringLiteralShape` /
  `RegularExpressionLiteralShape` / `NoSubstitutionTemplateLiteralShape`）；
- `IdentifierShape` / `PrivateIdentifierShape`。

语句形状（`…StatementShape` / `BlockShape` / `TryStatementShape` / `CatchClauseShape` …）与
候选形状（`…PossibleShape`）都不在此列：它们后面跟 `/` 是新语句、不是除号。

```ts
if (ExpressionAtomRegistry.HasContainer(unit)) {
  return true;
}
const name = unit.constructor.name;
if (name.endsWith("ExpressionShape")) {
  return true;
}
if (name.endsWith("LiteralShape")) {
  return true;
}
if (name === "IdentifierShape" || name === "PrivateIdentifierShape") {
  return true;
}
return false;
```

## static method IsControlHeadTail:(units:Array<Token>, bracketIndex:int)=>bool

`bracketIndex` 这个 `(` 是不是**控制头**（`if` / `while` / `for` / `with` 的条件括号）：
是 ⇒ 它的 `)` 是语句收尾，后面的 `/` 起正则。
`obj.if(a)` / `obj.while(a)` 这种**成员调用**不算——`(` 前面那个词之前的单元是 `.` / `?.`。

从 `CanStartAt` 里抽出来，`CanEndOperand` 与位置判据共用同一份判据。

```ts
const headIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, bracketIndex - 1);
if (headIndex < 0) {
  return false;
}
const head = units[headIndex];
if (!(head instanceof Common)) {
  return false;
}
const word = (head as Common).TempToString();
if (word !== "if" && word !== "while" && word !== "for" && word !== "with") {
  return false;
}
const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, headIndex - 1);
const before = beforeIndex >= 0 ? units[beforeIndex] : null;
if (before === null || !(before instanceof Symbol)) {
  return true;
}
const beforeText = (before as Symbol).TempToString();
return beforeText !== "." && beforeText !== "?.";
```

## static method IsArrowBodyTail:(units:Array<Token>, braceIndex:int, slashIndex:int)=>bool

`braceIndex` 这个 `{` 是不是**箭头函数体**、且它到 `slashIndex` 那个 `/` 之间**有换行**：
是 ⇒ TS 一定在这里断句，`/` 是新语句的正则起点（r1231）。
没有换行时仍是除号（`const g = (() => {}) / 2` 这一族）。

```ts
if (slashIndex < 0) {
  return false;
}
const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, braceIndex - 1);
if (beforeIndex < 0) {
  return false;
}
const before = units[beforeIndex];
if (!(before instanceof Symbol) || !(before as Symbol).Is("=>")) {
  return false;
}
return TypeScriptRegexTemplate.HasLineBreakBetween(units[braceIndex], units[slashIndex]);
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
行终止符口径统一交给 `LineTerminator`（LF / CR / U+2028 / U+2029，cover8-A）。

```ts
return LineTerminator.HasBetween(left.SourceRange, right.SourceRange);
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

**行终止符**：ECMAScript 的 LineTerminator 是 `\n` / `\r` / U+2028 / U+2029（CRLF 整体算一个），
而 core 的 `Template.LineTerminatorChars` 默认只有 `\n`（其它语言模板保持历史行为）。这里显式启用全集，
`LineAnnotation` 与 `Shebang` 才会在这四种字符处收尾——否则 `// c\rconst a = 1;` 会把 CR 之后的代码
整行吞进注释，`#!x\r…` 同理。

```ts
const template = new Template();
template.BranchTemplate.DefaultValue = Template.BasicBranchQueue();
template.LineTerminatorChars = "\n\r\u2028\u2029";
template.SymbolTemplate = new TypeScriptSymbolTemplate();
template.SymbolTemplate.AllowCombineSymbol(["**", "**=", "<<", ">>", ">>>", "<<=", ">>=", ">>>=", "&=", "|=", "^=", "%=", "&&=", "||=", "??="]);
template.NumberTemplate.BigIntSuffix = "n";
template.SymbolTemplate.SupportUnicodeEscapeIdentifier = true;
// D：ECMAScript 行续接认全部 LineTerminator（`\n` / `\r` / U+2028 / U+2029；CRLF 仍算一个）。
template.StringTemplate.LineTerminatorChars = ["\n", "\r", "\u2028", "\u2029"];
// G：模板串里的 legacy octal / `\8` `\9` 是非法转义，cooked 取原文（带标签模板合法）。
template.StringTemplate.StrictTemplateEscapes = true;
// `\u{…}` 位数不限（前导零任意多），只受 U+10FFFF 约束（F/cover7 口径；core 默认仍是历史 6 位上限）。
template.StringTemplate.AllowLongUnicodeBraceEscape = true;
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
