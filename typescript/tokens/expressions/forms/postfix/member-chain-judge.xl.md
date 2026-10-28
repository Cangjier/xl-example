# dependencies
```xl
import { Bracket } from "../../../../../core/syntax/basic-tokens/bracket.xl.md"
import { Common } from "../../../../../core/syntax/basic-tokens/common.xl.md"
import { SourceRange } from "../../../../../core/syntax/source-range.xl.md"
import { Symbol } from "../../../../../core/syntax/basic-tokens/symbol.xl.md"
import { SyntaxContext } from "../../../../../core/syntax/syntax-context.xl.md"
import { Template } from "../../../../../core/syntax/templates/template.xl.md"
import { Token } from "../../../../../core/syntax/token.xl.md"
import { ExpressionBuilder } from "../../expression-builder.xl.md"
import { InitializerTailJudge } from "../shared/initializer-tail-judge.xl.md"
```

# namespace cangjie

# class MemberChainJudge

## static field PrefixKeywords:Array<string> = ["delete", "typeof", "void", "await", "yield", "new", "function", "class", "async", "this", "true", "false", "null", "undefined", "let", "const", "var", "return", "throw", "if", "else", "for", "while", "do", "switch", "case", "break", "continue", "try", "catch", "finally", "with", "debugger", "export", "default", "as", "satisfies", "in", "instanceof"]

## static method EqualIndex:(units:Array<Token>)=>int

```ts
for (let at = 0; at < units.length; at++) {
  const unit = units[at];
  if (unit.IsTriviaToken) {
    continue;
  }
  if (unit instanceof Symbol && (unit as Symbol).Is("=")) {
    return at;
  }
}
return -1;
```

## static method FirstSignificant:(units:Array<Token>, from:int)=>int

```ts
for (let at = from; at < units.length; at++) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method LastSignificant:(units:Array<Token>)=>int

```ts
for (let at = units.length - 1; at >= 0; at--) {
  if (!units[at].IsTriviaToken) {
    return at;
  }
}
return -1;
```

## static method SuffixIndex:(units:Array<Token>, headAt:int)=>int

```ts
return MemberChainJudge.FirstSignificant(units, headAt + 1);
```

## static method HeadAllowed:(unit:Token)=>bool

```ts
if (!(unit instanceof Common)) {
  return false;
}
const text = (unit as Common).TempToString();
if (text.length === 0) {
  return false;
}
if ((unit as Common).CanStartNumber()) {
  return false;
}
if (MemberChainJudge.PrefixKeywords.includes(text)) {
  return false;
}
return true;
```

## static method NextWord:(unit:Token)=>string

```ts
const range = unit.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return "";
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  break;
}
let word = "";
while (at < count) {
  const ch = document.GetValue(at);
  const isWord = (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z")
    || (ch >= "0" && ch <= "9") || ch === "_" || ch === "$";
  if (!isWord) {
    break;
  }
  word += ch;
  at += 1;
}
return word;
```

## static method ChainFollows:(head:Token)=>bool

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return true;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  if (ch === "!" && at + 1 < count && document.GetValue(at + 1) === "=") {
    return false;
  }
  if (ch === "?" && at + 1 < count && document.GetValue(at + 1) === "?") {
    return false;
  }
  return ch === "." || ch === "?" || ch === "!" || ch === "[";
}
return false;
```

## static method PostfixEnd:(head:Token)=>int

```ts
const range = head.SourceRange;
let document = range.Document;
if (document === null) {
  document = SourceRange.CurrentDocument;
}
if (document === null || range.EndIndex < 0) {
  return -1;
}
const count = document.GetCount();
let at = range.EndIndex;
while (at < count) {
  const ch = document.GetValue(at);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029") {
    at += 1;
    continue;
  }
  break;
}
if (at >= count || document.GetValue(at) !== "!") {
  return -1;
}
const bangEnd = at + 1;
let tail = bangEnd;
while (tail < count) {
  const ch = document.GetValue(tail);
  if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "\f" || ch === "\v"
    || ch === "\u2028" || ch === "\u2029" || ch === ";") {
    tail += 1;
    continue;
  }
  return -1;
}
return bangEnd;
```

## static method Kind:(units:Array<Token>)=>string

```ts
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return "";
}
const headAt = MemberChainJudge.FirstSignificant(units, equalAt + 1);
if (headAt < 0) {
  return "";
}
const head = units[headAt];
if (!(head instanceof Common)) {
  return "";
}
const headText = (head as Common).TempToString();
const suffixAt = MemberChainJudge.SuffixIndex(units, headAt);
if (suffixAt < 0) {
  return "";
}
const suffix = units[suffixAt];
if (headText === "import") {
  // `import.meta`：`import` 是关键字主表达式，`.meta` 是唯一的合法后缀形态。
  if (!(suffix instanceof Symbol) || !(suffix as Symbol).Is(".")) {
    return "";
  }
  if (MemberChainJudge.NextWord(suffix) !== "meta") {
    return "";
  }
  return "meta";
}
if (headText === "super") {
  // `super.m`：`super` 是关键字主表达式（legacy `SuperKeywordShape`），只接 `.` 成员链。
  if (!(suffix instanceof Symbol) || !(suffix as Symbol).Is(".")) {
    return "";
  }
  return "super";
}
if (!MemberChainJudge.HeadAllowed(head)) {
  return "";
}
if (suffix instanceof Symbol) {
  const text = (suffix as Symbol).TempToString();
  if (text === ".") {
    return "member";
  }
  if (text === "?.") {
    return "optional";
  }
  if (text === "!") {
    return "nonnull";
  }
  return "";
}
if (suffix instanceof Bracket) {
  if ((suffix as Bracket).StartBracketChar === "[") {
    return "element";
  }
  return "";
}
return "";
```

## static method Claims:(kind:string, units:Array<Token>, tokenIndex:int)=>bool

```ts
if (tokenIndex < 0 || tokenIndex >= units.length) {
  return false;
}
const unit = units[tokenIndex];
if (unit.IsTriviaToken) {
  return false;
}
if (MemberChainJudge.Kind(units) !== kind) {
  return false;
}
if (unit instanceof Symbol) {
  const text = (unit as Symbol).TempToString();
  return text === "." || text === "?." || text === "!";
}
if (unit instanceof Bracket) {
  return (unit as Bracket).StartBracketChar === "[";
}
return false;
```

## static method CanBuild:(units:Array<Token>, template:Template, context:SyntaxContext)=>bool

```ts
if (MemberChainJudge.Kind(units) === "") {
  return false;
}
const equalAt = MemberChainJudge.EqualIndex(units);
if (equalAt < 0) {
  return false;
}
const last = MemberChainJudge.LastSignificant(units);
if (last <= equalAt) {
  return false;
}
// [D0:TAIL] 「之后只剩输入结束」的唯一判据（跳过 trivia、允许 `;`）。
if (!InitializerTailJudge.IsInitializerEnd(units, last)) {
  return false;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < units.length; at++) {
  if (units[at].IsTriviaToken) {
    continue;
  }
  raw.push(units[at]);
}
if (raw.length === 0) {
  return false;
}
const equalUnit = units[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const builder = new ExpressionBuilder(template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
try {
  builder.ParseExpression();
} catch (error) {
  return false;
}
return builder.At === builder.Units.length;
```

## static method Build:(host:Token, context:SyntaxContext)=>Token

```ts
const equalAt = MemberChainJudge.EqualIndex(host.Data);
if (equalAt < 0) {
  throw new Error("增量变量形状未支持：declaration 成员链缺赋值符");
}
const equalUnit = host.Data[equalAt];
let basePos = equalUnit.SourceRange.EndIndex;
if (basePos < 0) {
  basePos = equalUnit.SourceRange.StartIndex;
}
const raw:Array<Token> = [];
for (let at = equalAt + 1; at < host.Data.length; at++) {
  if (host.Data[at].IsTriviaToken) {
    continue;
  }
  raw.push(host.Data[at]);
}
const builder = new ExpressionBuilder(host.Template, context);
builder.Load(raw, basePos < 0 ? 0 : basePos);
const expression = builder.ParseExpression();
if (builder.At !== builder.Units.length) {
  throw new Error("增量变量形状未支持：declaration 初始化器未读完");
}
const start = equalAt + 1;
const removed = host.Data.length - start;
host.Data.splice(start, removed, expression);
expression.Parent = host;
host.MountedUnit = null;
return expression;
```
