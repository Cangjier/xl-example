# dependencies
```xl
import { BranchTransiter } from "../branch-transiter.xl.md"
import { Bom } from "../basic-tokens/bom.xl.md"
import { Shebang } from "../basic-tokens/shebang.xl.md"
import { AreaAnnotation } from "../basic-tokens/area-annotation.xl.md"
import { Bracket } from "../basic-tokens/bracket.xl.md"
import { Common } from "../basic-tokens/common.xl.md"
import { LineAnnotation } from "../basic-tokens/line-annotation.xl.md"
import { RegexToken } from "../basic-tokens/regex-token.xl.md"
import { StringGuide } from "../basic-tokens/string/string-guide.xl.md"
import { Symbol } from "../basic-tokens/symbol.xl.md"
import { WrapSymbol } from "../basic-tokens/wrap-symbol.xl.md"
import { KeywordTemplate } from "./keyword-template.xl.md"
import { MethodNameTemplate } from "./method-name-template.xl.md"
import { NumberTemplate } from "./number-template.xl.md"
import { RegexTemplate } from "./regex-template.xl.md"
import { Sequence } from "./sequence.xl.md"
import { SequenceTemplate } from "./sequence-template.xl.md"
import { StringTemplate } from "./string-template.xl.md"
import { SymbolTemplate } from "./symbol-template.xl.md"
```

# namespace cangjie

模板层：每个单元（token）的跳转规则都从 `Template` 上取。

一个 `Template` 实例就是一套语言配置，`TextContext` 构造时把它交给 `Root`。

# type TemplateInitializer = (template:Template)=>void

「拿模板做初始化」的委托。

参数表里用别名而不是直接写函数类型；别名右侧直接写 ts 语法。

# class Template

模板：一个上下文里所有单元共用的规则表。

七个模板字段都在初值里 `new` 出来。

## field BranchTemplate:SequenceTemplate<BranchTransiter> = new SequenceTemplate<BranchTransiter>()

跳转模板：按单元类型给出该单元要跑哪些跳转函数。

## field SymbolTemplate:SymbolTemplate = new SymbolTemplate()

符号模板。

## field StringTemplate:StringTemplate = new StringTemplate()

字符串模板：这门语言里字符串长什么样。

## field KeywordTemplate:KeywordTemplate = new KeywordTemplate()

关键字模板。

## field MethodNameTemplate:MethodNameTemplate = new MethodNameTemplate()

方法名模板。

## field RegexTemplate:RegexTemplate = new RegexTemplate()

正则模板：这门语言的正则字面量长什么样（flags 字符集、可以起表达式的关键字、以及「这个 `/` 该不该起正则」的默认判据）。

## field BomChars:Array<string> = ["\uFEFF", "\uFFFE"]

BOM 的码点表：`Bom` basic token 在**任意位置**认领其中的字符（用户裁定②：对齐 TS，U+FEFF 属 Whitespace；旧「只在 source index 0 认领」已取消）；语言无关，默认覆盖常见 BOM。

## field ShebangMarker:string = "#!"

Shebang 行的标记（默认 `#!`）。`Shebang` basic token 只在文件头允许的位置按它进入。

## field LineTerminatorChars:string = "\n"

行终止符字符集：`LineAnnotation` 与 `Shebang` 用 `IsLineTerminator` 判定「行到哪里结束」。

默认只有 `\n`，与这两个 basic token 的历史行为完全一致（其它语言模板不配置时零影响）；
各语言模板按自己的词法补齐——ts 模板配置为 `"\n\r\u2028\u2029"`（ECMAScript 的 LineTerminator 全集）。

CRLF 不需要在这里成对声明：判据按「先遇到 `\r` 就收尾」工作，`\n` 由根单元当普通 trivia 处理。

## method IsLineTerminator:(item:string)=>bool

单个字符是不是本语言的行终止符：`item` 在 `LineTerminatorChars` 里即是。

```ts
return item.length === 1 && this.LineTerminatorChars.indexOf(item) >= 0;
```

## field NumberTemplate:NumberTemplate = new NumberTemplate()

数字模板：这门语言的数字字面量允许哪些后缀（不改节点种类的普通后缀，以及改用 BigIntLiteral 的 BigInt 后缀）。

## private static field BasicBranchQueueCache:Sequence<BranchTransiter> | null = null

`BasicBranchQueue` 的缓存；`null` 表示还没建过。

## static method BasicBranchQueue:()=>Sequence<BranchTransiter>

basic tokens 的跳转队列：注释 → 正则 → 字符串 → 括号 → 空白 → 符号 → 通用字符。

**它必须列全所有 basic token**：漏掉一个，那类字符就没人认领，只能落到 `Default` 被静默吞掉。

**`StringGuide` 排在 `Symbol` 之前**：字符串的引号也是符号字符，字符串必须先认领；否则 `"` 会先变成单字符符号。

**`WrapSymbol` 排在 `Symbol` / `Common` 之前**：空白只归空白块，`Symbol` 与 `Common` 都明确拒绝空白，排在哪它们都不会接；放在前面是因为「先收掉不属于结构的字符，再让结构字符各自认领」这条读起来更顺。

**`Symbol` 必须排在 `Common` 之前、`Bracket` 之后**：标点只归符号块，而三个开括号已经被 `Bracket` 认领完了，再问符号块才轮得到 `;` / `=` 这些；反过来把 `Symbol` 放在 `Bracket` 前面，`(` 会先被当成单字符符号。

**为什么是方法而不是 static 字段。** 模板与 basic tokens 互为依赖（模板要列出它们的跳转函数，它们的构造器要问模板要自己的队列），写成类定义期求值的 `static readonly field` 会读到 `undefined`——require 环里先执行的那一半还没把类定义出来。改成方法 + 缓存之后，那 8 个函数引用只在第一次调用时才读，那时所有模块都已加载完。

```ts
if (Template.BasicBranchQueueCache === null) {
  Template.BasicBranchQueueCache = new Sequence<BranchTransiter>([
    Bom.Transit,
    Shebang.Transit,
    AreaAnnotation.Transit,
    LineAnnotation.Transit,
    RegexToken.Transit,
    StringGuide.Transit,
    Bracket.Transit,
    WrapSymbol.Transit,
    Symbol.Transit,
    Common.Transit,
  ]);
}
return Template.BasicBranchQueueCache;
```

## method Initialize:(onInitialize:TemplateInitializer)=>Template

拿自身跑一遍初始化回调，然后返回自身，便于链式写。

```ts
onInitialize(this);
return this;
```
