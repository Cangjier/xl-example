# dependencies
```xl
import { StringConfig } from "./string-config.xl.md"
```

# namespace cangjie

词法表（设计 §1.1）：core 认字、配对、分词**全读它**。

规矩一句话：**core 只读表，一个语言词都不许有**——表可以有最保守的空默认值（什么都不算），
但不许有一份看起来像某门语言的默认值。模板每次解析新建一份，所以「语言层覆盖默认值」天然成立。

# class CommentConfig

注释标记：**本设计在 §1.1 那五行之外补的一行**——`//` 与 `/* */` 和引号一样是语言词，
所以它们也只能住在表里，不能写在 `CommentToken` 的代码里。

## field LineStart:string = ""

行注释的开头（如 `//`）；空串表示没有行注释。

## field BlockOpen:string = ""

块注释的开头（如 `/*`）。

## field BlockClose:string = ""

块注释的结尾（如 `*/`）。

## method IsEmpty:()=>bool

三个标记一个都没有时，这门语言没有注释这一回事。

```ts
return this.LineStart === "" && this.BlockOpen === "" && this.BlockClose === "";
```

# class RegexConfig

正则（§1.1 字符串配置那一行里的最后一格）：定界符与标志字符，同样**是数据**。

## field Delimiters:string = ""

能当正则定界符的字符；空串表示这门语言的字面量里没有正则这一档。

## field Flags:string = ""

合法标志字符。

## field EscapeChar:string = ""

正则里的转义引导符。

## field ClassOpen:string = ""

字符类的开符号（`[`）；字符类里的定界符不算收口。

## field ClassClose:string = ""

字符类的闭符号（`]`）。

# class Lexicon

**词法表**。行与列就是 §1.1 那张表：符号 / 空白 / 数字表、配对表、运算符集、词表、字符串配置。

这一页没有一个方法里出现某一门语言的字符——方法只做**表读**。

## field SymbolChars:string = ""

哪些字符算符号。

## field WhitespaceChars:string = ""

哪些字符算空白。

## field NewlineChars:string = ""

空白里哪几个算**换行**（`WrapToken` 只认它们）。它是「空白表」的第二个面，不是第六张表。

## field DigitChars:string = ""

哪些字符算数字。

## field PairTable:Map<string,string> = new Map()

配对表：开符号 → 闭符号。

## field AssignOperators:Set<string> = new Set()

赋值运算符。

## field CompareOperators:Set<string> = new Set()

比较运算符。

## field CompoundAssignOperators:Set<string> = new Set()

复合赋值运算符。

## field MemberOperators:Set<string> = new Set()

成员访问运算符。

## field StatementEndOperators:Set<string> = new Set()

语句结束符。

## field PunctuationOperators:Set<string> = new Set()

**运算符集那一行的第六格**：不落在前五类里的多字符符号串（`=>` / `...` / `?.` / `??` 这种）。

它的存在是**实测逼出来的**：前五类是按语义分的，而词法这一层需要的是
「哪些多字符符号串算一个符号」——少了这一格，`=>` 会断成 `=` 与 `>`。

## field Keywords:Set<string> = new Set()

关键字。

## field ModifierWords:Set<string> = new Set()

修饰词。

## field DeclarationWords:Set<string> = new Set()

声明词。

## field String:StringConfig = new StringConfig()

字符串配置（见 `string-config.xl.md`）。

## field Comment:CommentConfig = new CommentConfig()

注释配置。

## field Regex:RegexConfig = new RegexConfig()

正则配置。

## method ClassOf:(ch:string)=>string

一个字符的**词法类**：`symbol` / `whitespace` / `digit` / `text` / `end`。

顺序本身就是判据：符号 > 换行（空白）> 数字 > 其余算 `text`——三张表可以重叠，重叠时按这一序。
`text` 是「三张表都没认领」的那一堆，也就是名字与字面量正文的字符；**core 不需要第四张表**。

```ts
if (ch === "") return "end";
if (this.SymbolChars.includes(ch)) return "symbol";
if (this.WhitespaceChars.includes(ch)) return "whitespace";
if (this.DigitChars.includes(ch)) return "digit";
return "text";
```

## method IsSymbol:(ch:string)=>bool

符号表那一问（`ClassOf` 的第一个面）。

```ts
return this.SymbolChars.includes(ch);
```

## method IsWhitespace:(ch:string)=>bool

空白表那一问。

```ts
return this.WhitespaceChars.includes(ch);
```

## method IsNewline:(ch:string)=>bool

空白里「算换行」的那一问——`WrapToken` 只认这些字符。

```ts
return this.NewlineChars.includes(ch);
```

## method IsDigit:(ch:string)=>bool

数字表那一问。

```ts
return this.DigitChars.includes(ch);
```

## method Partner:(ch:string)=>string

配对表里那个符号的另一半；不是配对符号时给空串。

```ts
const partner = this.PairTable.get(ch);
return partner === undefined ? "" : partner;
```

## method HasOperatorPrefix:(text:string)=>bool

五张运算符表里**有没有一个以 `text` 开头**的词。

`SymbolToken` 靠这一格做最长匹配：还能当某个运算符的前缀就继续吃，不是前缀就停。
这一版按表逐项前缀比较（表很小）；真上量时换前缀树是这一格自己的事，调用点一个字不用改。

```ts
if (text === "") return false;
for (const word of this.AssignOperators) {
  if (word.startsWith(text)) return true;
}
for (const word of this.CompareOperators) {
  if (word.startsWith(text)) return true;
}
for (const word of this.CompoundAssignOperators) {
  if (word.startsWith(text)) return true;
}
for (const word of this.MemberOperators) {
  if (word.startsWith(text)) return true;
}
for (const word of this.StatementEndOperators) {
  if (word.startsWith(text)) return true;
}
for (const word of this.PunctuationOperators) {
  if (word.startsWith(text)) return true;
}
return false;
```
