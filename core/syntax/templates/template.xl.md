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
import { BasicDispatch } from "./basic-dispatch.xl.md"
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

## field BasicClassTable:string = ""

basic token 的 ASCII 分类表（由 `BasicDispatch` 懒建）：空串 = 未建；否则是 128 个字符，
第 `i` 个字符的码点低 7 位就是第 `i` 个 ASCII 字符的分类位——1 = BOM、2 = Shebang 标记首字符、
4 = Quotes、8 = 开括号、16 = `IsWhiteSpace`、32 = `IsSymbol`、64 = plain（标识符/数字正文）。

每一位都是**建表那一刻**用本模板自己的谓词问出来的（见 `BasicDispatch.BuildClassTable`），
所以模板把哪个字符配进 `BomChars` / `Quotes` / `AllowedSymbol`，表就跟着变。

**建表之后本模板的分类必须冻结。** 运行期再改 `BomChars` / `ShebangMarker` /
`StringTemplate.Quotes` / `SymbolTemplate` 的禁用/允许表，或覆写 `IsSymbol` / `IsWhiteSpace`,
表就过期了；而且过期方向可能**静默改变分词**：例如模板后来把 `"` 加进 Quotes，表仍说「不是引号」→
`StringGuide` 不被调用，`Common` 又拒绝引号 → 该字符没人接手，落到 `Default` 被吞掉（不报错，产出错树）。
`Initialize` 会在跑初始化回调前清空本字段，下一次 `Transit` 重新建表；除了这条路径，模板只允许在 parse 前配置。

## private static field BasicBranchQueueCache:Sequence<BranchTransiter> | null = null

`BasicBranchQueue` 的缓存；`null` 表示还没建过。

## static method BasicBranchQueue:()=>Sequence<BranchTransiter>

basic tokens 的跳转队列：**只装一条**融合分派 `BasicDispatch.Transit`。

原来这里按次序装着十条 `Transit`——BOM → Shebang → 区域注释 → 行注释 → 正则 → 字符串 → 括号 → 空白 → 符号 → 通用字符，
`UnitToken.Process` 在每个位置逐条问过去；profile 里一个字符平均要问 3.37 条才有人接手，而每条都要各自回看一次前文。
现在这十条的**顺序与判据**原样搬进 `BasicDispatch.Transit`：它先用最便宜的判据筛掉「必然 `Undo` 且不写树」的那几条，
再把仍然可能接手的字符转交给对应 `Transit`——认下之后怎么收尾、怎么新开，仍只有那一份实现（逐段依据见 `basic-dispatch.xl.md`）。

**这里必须仍然覆盖所有 basic token**：漏掉一条，那类字符就没人认领，只能落到 `Default` 被静默吞掉。
这条保证现在由 `BasicDispatch.Transit` 的分派表承担。

**相对顺序不变**：`StringGuide` 必须排在 `Symbol` 之前（引号也是符号字符，字符串要先认领）、
`Symbol` 必须排在 `Common` 之前（标点只归符号块，`Common` 明确拒绝符号与空白）、
`WrapSymbol` 排在 `Symbol` / `Common` 之前——这些次序在 `BasicDispatch.Transit` 的段落顺序里逐字保留。
队列本身仍只存**函数引用**、不改顺序：第 5 个参数 `value` 是调度层在每个位置上读好的当前字符（见 `BranchTransiter`），
队列不读字符、也不重排。

**为什么是方法而不是 static 字段。** 模板与 basic tokens 互为依赖（模板要列出它们的跳转函数，它们的构造器要问模板要自己的队列），
写成类定义期求值的 `static readonly field` 会读到 `undefined`——require 环里先执行的那一半还没把类定义出来。
改成方法 + 缓存之后，那个函数引用只在第一次调用时才读，那时所有模块都已加载完。

```ts
if (Template.BasicBranchQueueCache === null) {
  Template.BasicBranchQueueCache = new Sequence<BranchTransiter>([
    BasicDispatch.Transit,
  ]);
}
return Template.BasicBranchQueueCache;
```

## method Initialize:(onInitialize:TemplateInitializer)=>Template

拿自身跑一遍初始化回调，然后返回自身，便于链式写。

回调负责配置模板；配置可能改到分类谓词，所以**回调前先清空 `BasicClassTable`**，
让下一次 `BasicDispatch.Transit` 按新配置重建表（见 `## field BasicClassTable` 的冻结契约）。

```ts
this.BasicClassTable = "";
onInitialize(this);
return this;
```
