# namespace cangjie

catalog guide 与 shape token：与语言无关的那一半（`core`）。

`StringToken` 的配置（设计 §2）：**一种类，不是一族类**——引号、转义、原始 / 逐字、插值、模板、多行
全部由这一页给出，换语言换的是配置，不是类。

**配置必须是数据**（§2 第 3 条）：这一页里没有一个函数、没有一张正在用的正则——两样都会把
某一门语言的语法钉进 core。

# enum StringForm

字符串的形态。**一份配置声明若干形态，同一时刻只处于其中一个**（§2 第 2 条）。

- case Normal
普通串：解释转义、不跨行。
- case Raw
原始 / 逐字：不解释转义。
- case Interpolation
插值串：洞里的内容由**挂载的子单元**自己啃（§2.1）。
- case Template
模板串：是被调用的那一种形态。

# class StringConfig

字符串配置：全部由**语言层**在装配时写进模板；core 这几格是最保守的空默认值。

## field QuotePairs:Map<string,string> = new Map()

引号集：开串符号 → 闭串符号。**成组引号**（开闭不是一个符号）就靠这一格；一个符号配自己就是普通引号。

它是表、不是函数，因为「哪些符号是引号」是语言词（§2 第 3 条）。

## field Forms:Map<string,string> = new Map()

形态切分：开串符号 → 形态名（`StringForm` 的四个 case 之一）。

**形态在开串那一刻由「配置 + 开串符号」一次定死**（§2.1）——所以 `StringToken` 不需要 catalog guide。

## field EscapeChar:string = ""

转义引导符；空串表示这门语言没有转义这一回事。

## field EscapeSequences:Set<string> = new Set()

合法转义序列（**不含**引导符本身）。

## field UnknownEscapeKeepsChar:bool = true

遇到未知转义怎么处理：`true` = 把引导符后面那个字符原样留下（不报错、也不吞掉）。

## field InterpolationOpen:string = ""

插值洞的开定界符；空串表示这门语言没有插值。

## field InterpolationClose:string = ""

插值洞的闭定界符。

## field InterpolationNests:bool = false

洞里能不能再嵌一层同样的串。

## field MultilineForms:Set<string> = new Set()

哪些**形态**允许跨行——多行也是按形态切分的（§2 第 2 条）。

## method HasQuote:(ch:string)=>bool

这个字符能不能开一个串。

```ts
return this.QuotePairs.has(ch);
```

## method ClosingOf:(ch:string)=>string

开串符号对应的闭串符号；不是引号时给空串。

```ts
const close = this.QuotePairs.get(ch);
return close === undefined ? "" : close;
```

## method FormOf:(ch:string)=>string

开串符号对应的形态名；表里没写就按 `Normal` 算（最保守的那一档）。

```ts
const form = this.Forms.get(ch);
return form === undefined ? "Normal" : form;
```
