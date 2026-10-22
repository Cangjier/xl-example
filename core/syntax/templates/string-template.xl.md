# namespace cangjie

模板层：每个单元（token）的跳转规则都从 `Template` 上取。

字符串模板：**这门语言里「字符串长什么样」**。

它只描述语言事实——哪些字符起一个字符串、有没有逐字 / 前缀内插 / 引号内插 / 原始串、转义符是哪些。

**单个字符串的形状不在这里**：这一串是不是逐字、内插了几个 `$`、原始串用了几个引号，是 `StringGuide` 认出形状之后写在 `String` 实例上的那几个字段（它们会进 XML）。所以 `String` 上的 `IsSupportVerbatim` 之类不是配置，是「这一串的事实」；模板回答的是「这门语言有没有这种串」。

默认值就是 **TypeScript 的字符串形式**：三种引号、没有逐字串 / 原始串 / 前缀式内插，**有引号内内插**（`` `${…}` ``）；`HasInterpolationQuoteChars` 默认开，`InterpolationQuoteChars` 默认只列反引号。要给别的语言（C# / Cangjie 那一族）时再逐项覆盖。

两个**扫描细节**的开关默认取「既有行为」，由具体语言的模板页按需收紧/放开：`LineTerminatorChars`（行续接认哪些行终止符，默认 CR/LF）与 `StrictTemplateEscapes`（模板串里的非法转义是否保留原文，默认关）。ts 模板页（`typescript/run/typescript-template.xl.md`）把两者都打开 —— ECMAScript 的行续接认 LS/PS，模板串的 legacy octal / `\8` `\9` 保留原文。

# class StringTemplate

## field Quotes:Array<string> = ['"', "'", "`"]

起一个字符串的字符。默认 ts 的三个。

## field EscapeChars:Array<string> = ['\\']

转义符。默认 ts 只有 `\`；留成数组是为了别的语言能加。`String` 的两条转义路径（普通串 / 模板串）都从这里取，不再写死反斜杠。

## field LineTerminatorChars:Array<string> = ["\n", "\r"]

行终止符：转义符后面紧跟这些字符时是一次**行续接**（LineContinuation），不产出字符。
默认只有 `\n` / `\r`（CRLF 由 `\r\n` 两个字符一起收，见 `Translate.Append`），即**既有行为**；
需要 ECMAScript 那一套的语言在模板页追加 `\u2028` / `\u2029`（LS / PS）——`String` 把本表交给
`Translate.DecodeClear`，转义累积逻辑本身不知道语言。

## field StrictTemplateEscapes:bool = false

引号内内插串里的**非法转义**是否保留原文：`true` 时 legacy octal（`\1`–`\7`、`\00`）与
NonOctalDecimalEscape（`\8` / `\9`）不解成字符，而是原样输出 `\1` / `\8`（cooked text 取原文的那一侧）。
默认 `false` = 既有行为（按八进制 / 字符解码）。ECMAScript 模板串正是这个口径（带标签模板合法、
不带标签模板是语法错误），ts 模板页把它打开；`String` 只对**引号内内插串**应用本开关
（普通引号串仍按既有行为解码），因为引号内内插串才是这门语言的模板串。

## field VerbatimPrefix:string = "@"

逐字字符串的前缀字符（C# 的 `@"..."`）。

## field InterpolationPrefix:string = "$"

**前缀式**内插字符串的前缀字符（C# 的 `$"..."`）。

## field HasVerbatim:bool = false

这门语言有没有 `@"..."` 这种逐字字符串。默认关（ts 没有）。

## field HasInterpolationPrefix:bool = false

这门语言有没有 `$"..."` 这种**前缀式**内插字符串。默认关（ts 没有）。打开之后 `String` 会把 `{` 交给 `InterpolationGuide`，按 `InterpolationCount`（前面 `$` 的个数）数连续左花括号——不是一见 `{` 就开一层。

## field HasInterpolationQuoteChars:bool = true

这门语言有没有**引号内内插**：引号串里的 `${...}`（ts 的模板串）。默认开（ts 有）；打开它之后才轮到 `InterpolationQuoteChars` 决定哪些引号算数。

## field InterpolationQuoteChars:Array<string> = ["`"]

哪些引号起的串用 `${...}` 内插。只在 `HasInterpolationQuoteChars` 打开时生效；默认给 ts 的反引号。

## field HasRaw:bool = false

这门语言有没有 `"""..."""` 这种原始字符串。默认关（ts 没有）。
