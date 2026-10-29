# dependencies
```xl
import { RegexTemplate } from "../../core/syntax/templates/regex-template.xl.md"
import { Template } from "../../core/syntax/templates/template.xl.md"
import { TypeScriptSymbolTemplate } from "./typescript-symbol-template.xl.md"
import { Common } from "../../core/syntax/basic-tokens/common.xl.md"
import { RegexToken } from "../../core/syntax/basic-tokens/regex-token.xl.md"
import { String } from "../../core/syntax/basic-tokens/string/string.xl.md"
import { Symbol } from "../../core/syntax/basic-tokens/symbol.xl.md"
import { Token } from "../../core/syntax/token.xl.md"
import { LineTerminator } from "./line-terminator.xl.md"
```

# namespace cangjie

# class TypeScriptRegexTemplate extends RegexTemplate

## method IsFlag:(value:string)=>bool

```ts
return value.length > 0 && /^[\p{ID_Continue}]$/u.test(value);
```

## method CanStartAt:(units:Array<Token>, index:int)=>bool

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
if (last instanceof Symbol && last.Is(")") && TypeScriptRegexTemplate.IsControlHeadTail(units, lastIndex)) {
  return true;
}
if (last instanceof Common) {
  const tail = (last as Common).TempToString();
  if (tail === "else" || tail === "do") {
    return true;
  }
}
if (last instanceof Symbol && last.Is("}")) {
  // 箭头函数体 `() => { }` 之后换行再 `/`：TS 一定断句（箭头体的 `}` 后不能接二元运算），
  // 该 `/` 是新语句的正则起点（r1231）。对象字面量 / `function` 表达式体仍走原判据
  //（它们后面跟 `/` 可能是除号：`const o = {} / 2` / `const f = function () {} / 2` 都是除法）。
  const openIndex = TypeScriptRegexTemplate.MatchingOpenIndex(units, lastIndex, "{", "}");
  if (openIndex >= 0 && TypeScriptRegexTemplate.IsArrowBodyTail(units, openIndex, slashIndex)) {
    return true;
  }
  return openIndex >= 0 && TypeScriptRegexTemplate.IsStatementBraceTail(units, openIndex);
}
return false;
```

## method CanEndOperand:(units:Array<Token>, unitIndex:int, slashIndex:int)=>bool

```ts
const unit = unitIndex >= 0 ? units[unitIndex] : null;
if (unit === null) {
  return false;
}
if (unit instanceof String || unit instanceof RegexToken) {
  return true;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  if (text === ")") {
    return !TypeScriptRegexTemplate.IsControlHeadTail(units, unitIndex);
  }
  if (text === "]") {
    return true;
  }
  if (text === "}") {
    const openIndex = TypeScriptRegexTemplate.MatchingOpenIndex(units, unitIndex, "{", "}");
    if (openIndex >= 0) {
      if (TypeScriptRegexTemplate.IsStatementBraceTail(units, openIndex)) {
        return false;
      }
      if (TypeScriptRegexTemplate.IsArrowBodyTail(units, openIndex, slashIndex)) {
        return false;
      }
    }
    return true;
  }
  if (text !== "++" && text !== "--") {
    return false;
  }
  const beforeIndex = TypeScriptRegexTemplate.PreviousCodeIndex(units, unitIndex - 1);
  return beforeIndex >= 0 && this.CanEndOperand(units, beforeIndex, -1);
}
if (unit instanceof Common) {
  return !this.ExpressionKeywords.includes((unit as Common).TempToString());
}
if (!unit.IsBasicToken) {
  return TypeScriptRegexTemplate.IsOperandShape(unit);
}
return false;
```

## static method IsOperandShape:(unit:Token)=>bool

```ts
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

```ts
let at = fromIndex;
while (at >= 0 && units[at].IsTriviaToken) {
  at--;
}
return at;
```

## static method HasLineBreakBetween:(left:Token, right:Token)=>bool

```ts
return LineTerminator.HasBetween(left.SourceRange, right.SourceRange);
```

## static method SlashIndex:(units:Array<Token>, index:int)=>int

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

## static method MatchingOpenIndex:(units:Array<Token>, closeIndex:int, open:string, close:string)=>int

```ts
let depth = 0;
for (let at = closeIndex; at >= 0; at--) {
  const unit = units[at];
  if (!(unit instanceof Symbol)) {
    continue;
  }
  const text = (unit as Symbol).TempToString();
  if (text === close) {
    depth++;
  } else if (text === open) {
    depth--;
    if (depth === 0) {
      return at;
    }
  }
}
return -1;
```

## static method IsStatementBraceTail:(units:Array<Token>, braceIndex:int)=>bool

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
if (before instanceof Symbol && (before as Symbol).Is(")")) {
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
