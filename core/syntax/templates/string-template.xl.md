# namespace cangjie

模板层：每个单元（token）的跳转规则都从 `Template` 上取。

字符串模板：**这门语言里「字符串长什么样」**。

它只描述语言事实——哪些字符起一个字符串、有没有逐字 / 前缀内插 / 引号内插 / 原始串、转义符是哪些。

**单个字符串的形状不在这里**：这一串是不是逐字、内插了几个 `$`、原始串用了几个引号，是 `StringGuide` 认出形状之后写在 `String` 实例上的那几个字段（它们会进 XML）。所以 `String` 上的 `IsSupportVerbatim` 之类不是配置，是「这一串的事实」；模板回答的是「这门语言有没有这种串」。

默认值就是 **TypeScript 的字符串形式**：三种引号、没有逐字串 / 原始串 / 前缀式内插，**有引号内内插**（`` `${…}` ``）；`HasInterpolationQuoteChars` 默认开，`InterpolationQuoteChars` 默认只列反引号。要给别的语言（C# / Cangjie 那一族）时再逐项覆盖。

# class StringTemplate

## field Quotes:Array<string> = ['"', "'", "`"]

起一个字符串的字符。默认 ts 的三个。

## field EscapeChars:Array<string> = ['\\']

转义符。默认 ts 只有 `\`；留成数组是为了别的语言能加。`String` 的两条转义路径（普通串 / 模板串）都从这里取，不再写死反斜杠。

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
