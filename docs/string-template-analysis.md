# StringGuide / StringTemplate 改造梳理（默认 = TypeScript 字符串形式，支持 `${…}`）

> **后续进展（形状层轮）**：本页记的是 **token 层**的帐（token 层已落地，`tmp/verify-string-tokens.mjs` 18/18）。
> 之后**模板形状层已落地**：七页模板形状补了 `Text` / `FromBasicToken`，`ExpressionBuilder` 补了
> `IsTemplateToken` / `ParseTemplateToken`（head/span/tail 切分）、`ParsePostfix` 的标签模板分支，
> 并顺带打通了对象 / 数组字面量。`typescript/cases/string.ts` 现在 **75 / 75 全绿**，全量 **782 / 782**。
> 细节见 [docs/expression-ast-analysis.md](expression-ast-analysis.md) §4.1 / §4.5；本页 §7 的验收读数已过时，以那边为准。

本文回答三件事：**ts 的字符串在词法层到底长什么样**、**现在的 `StringTemplate` / `StringGuide` / `String` 为什么给不出它**、以及**要改哪几个文件、每条判据怎么落**。

**边界**：`core/syntax/basic-tokens/` 属于「basic token 只能由用户发起修改」（`typescript/IMPORTANCE.md` §3.1）。本文是改动前的梳理，**没有改任何代码**。实际要动的文件是 §6 那五处；**只改 `StringGuide` 与 `StringTemplate` 不够**——`${` 的第一个字符 `$` 是在 `String.Default` 里被吃掉的，见 §2.5。

---

## 0. 直接回答

### 0.1 目标

| 项 | 改成什么 |
| --- | --- |
| `StringTemplate` 的**默认值** | ts 形式：三种引号；`HasVerbatim` / `HasInterpolationPrefix` / `HasRaw` 三个开关 `false`，`HasInterpolationQuoteChars=true`（``InterpolationQuoteChars=["`"]``） |
| `StringGuide` | 「这个串是不是模板串、要不要内插」按**引号**判（`` ` `` 是），不再只靠 `$` 前缀回看 |
| `$"…"`（C# 前缀式内插） | 能力**保留**，但默认关闭；把它做成模板上的一组显式字段（`HasInterpolationPrefix`），不再是「默认形态」 |
| ts 模板串的产物 | `IsSupportInterpolation=True`、`InterpolationCount=1`、`String` 下挂 `ConstString` / `InterpolationString`，**没有空 `ConstString`** |
| `TypescriptTemplate.Create` | 删掉那 4 行字符串覆盖（默认值已经是 ts） |

### 0.2 关键判断（三条，后面都有实测支撑）

1. **内插形态由「引号」决定，而不是由「前缀」决定。** C# 是 `$"` ——内插是引号**前面**的一个前缀，`$` 的个数决定一个内插要几个 `{`（`InterpolationCount` 的来源）。ts 是 `${` ——内插是引号**里面**的两个字符，`$` 永远只有一个、`{` 永远只开一层。这两件事只能由模板分别声明，不能共用一个 `HasInterpolationPrefix`。
2. **`$` 不能先攒进常量块再 `Undo`。** 现行做法（`String.Default` 路径 6）是「`$` 先当文本收下，看到后一个字符是 `{` 再从常量块里退掉」。它留下空 `ConstString`、依赖 `LastTranslateSource` 绕过 `\${`、把「形状判定」塞进了「收字符」的兜底分支。正确做法是在看到 `$` 时**看一眼下一个字符**：是 `{` 就只记住位置、不落常量；不是 `{` 就正常落常量。
3. **这把 `IsSupportInterpolation=True` 正好变成「这是模板串」的词法判据**，也就顺带回答了 `docs/expression-ast-analysis.md` §4.1 里那个决策点（模板要不要在 basic token 层单立一种）：不用新增第 9 种 basic token，用现有 `String` 的字段（§3.2）就够区分 `"…"` / `'…'` / `` `…` ``。

### 0.3 实测基线（改之前先记住，改完必须不动）

```bash
node typescript/cases/ast-json-diff.mjs   # 707 / 707 完全一致，exit 0
node tests/parse/validate.mjs             # 1707 条用例，0 条不合格
node_modules/.bin/tsc --noEmit            # 0 error
```

`npm run samples` 现在**跑不动**：`build/ts/cjcli.js` 不存在，`cjcli.xl.md` 的依赖还写着 `./dawn/text/text-document.xl.md`（`dawn/` 在本分支已不存在）。这与本次改动无关，但意味着验收不能靠 samples，见 §7.2。

### 0.4 本轮范围（已落地）

分两步落地：**配置面**（`StringTemplate` 的字段与默认值）与**词法面**（`StringGuide` / `String.Default` 接 `${…}`）。

配置面（上一轮）：

- `HasInterpolation` 改名 `HasInterpolationPrefix` —— 它只表示**前缀式**内插（C# `$"…"`）；
- 新增 `HasInterpolationQuoteChars:bool`（有没有**引号内内插** `${…}`，ts 的模板串）与 `InterpolationQuoteChars:Array<string>`（哪些引号算数）；
- 默认值 = ts：`Quotes` 改成三个引号，`HasVerbatim=false`、`HasInterpolationPrefix=false`、`HasInterpolationQuoteChars=true`、`HasRaw=false`；`InterpolationQuoteChars` 预置反引号；
- `TypescriptTemplate.Create` 删掉那四行字符串覆盖（默认值已经等价）。

词法面（本轮）：

- `StringGuide.Transit`：`HasInterpolationQuoteChars` 且引号在 `InterpolationQuoteChars` 里时，给新建的向导置 `IsSupportInterpolation = true` / `InterpolationCount = 1`；
- `String.Default` 第 2 条路径按「前缀式 / 引号内式」分两支：引号内式用 `PendingInterpolation` 记住 `${` 的 `$`（预览下一字符），`{` 到了才挂 `InterpolationString`；第 6 条路径删掉旧的 `{` + `$` 私活与 `LastTranslateSource`；
- 产物：模板串的 XML 变成 `IsSupportInterpolation=True / InterpolationCount=1`，空 `ConstString` 消失（`tmp/verify-string-tokens.mjs` 18 / 18）。

**量出来的账**（token 轮当时）：`typescript/cases/string.ts` 75 条，AST 对拍 **34 / 75**（S1 / S2 / S7 全绿 34 条；S3–S6 41 条是形状层的账）；全量 **741 / 782**。形状层轮之后这两组读数分别是 **75 / 75** 与 **782 / 782**。

P0/P1/P2 的 token 层缺口已补（详见 §8）：`\uXXXX` / `\xNN` / `\u{…}` / NonEscapeCharacter / 八进制 / `\a` / `\` + CRLF 续行 / 模板内真 CRLF 归一 / 非法转义的原文恢复 / ts 形态不再建向导（EOF 无未决向导）/ `$` 在 close 时补落。前缀式内插与 `EscapeChars` 也都改成受模板控制（§8.3）；token 层**不向后看、不取文档级全局信息**。

---

## 1. ts 侧硬约束（实测 `ts.createSourceFile`，均为无语法错输入）

### 1.1 模板串的节点与区间

| 源码 | 节点与区间 |
| --- | --- |
| `` `t`; `` | `FirstTemplateToken[0,3)`（= `NoSubstitutionTemplateLiteral`）`text="t"` |
| `` `a${b}c`; `` | `TemplateExpression[0,8)` → `TemplateHead[0,4) text="a" raw="\`a${"`、`TemplateSpan[4,8)` → `Identifier[4,5)`、`LastTemplateToken[5,8) text="c" raw="}c\`"` |
| `` `${a}`; `` | `TemplateHead[0,3) text=""`、`LastTemplateToken[4,6) text=""` |
| `` `a${b}c${d}e`; `` | `TemplateHead[0,4)`；`TemplateMiddle[5,9) text="c" raw="}c${"`；`LastTemplateToken[10,13) text="e"` |
| `` tag`a${b}c`; `` | `TaggedTemplateExpression[0,11)` → `TemplateExpression[3,11)`（模板部分与上同形） |

区间口径可以归纳成一句：**定界符里 `$` 和 `{` 归 head/middle，`}` 归 tail**。`TemplateHead[0,4)` 的 `raw` 是 `` `a${ ``、`TemplateMiddle[5,9)` 的 `raw` 是 `}c${`、`LastTemplateToken[10,13)` 的 `raw` 是 `}e\``。

### 1.2 词法层必须分清的七件事

| 输入片段 | ts 的行为 | 词法层要做的判断 |
| --- | --- | --- |
| 反引号（起 / 止） | 起、止模板串 | `StringChar`，现有 `Quotes` 已覆盖 |
| `\` 转义 | `\``→`` ` ``、`\$`→`$`、`\\`→`\`、`\n` 等；`\{` / `\d` 这类 NonEscapeCharacter 也合法 | 现有 `Translate` 覆盖了常用序列（`$` / `` ` `` 两个 case 已经在表里）；`\{` 这类非转义字符会抛「未知转义字符」，见 D7 |
| `${` | 开一段内插，直到配对 `}` | **本轮要补的判据** |
| `$` 后面不是 `{` | 字面 `$`（`` `a$b` `` 的 `text` 是 `a$b`；`` `$` `` 的 `text` 是 `$`） | 不能一见 `$` 就当内插 |
| `{` / `}` 单独出现 | 字面字符（ts 没有 C# 那种 `{{` 转义） | **不能一见 `{` 就挂 `InterpolationString`** |
| `$${a}` | 字面 `$` + 一段内插（`TemplateHead` 的 `text` 是 `$`） | 第一个 `$` 的字面化要保住 |
| `\${a}` | 整段字面 `${a}`（`text` 是 `${a}`，无 `TemplateExpression`） | 转义解出来的 `$` 不参与 `${` |

`${` 的内容是**任意表达式**，所以里面可以再有 `{…}`、字符串、甚至嵌套模板：

| 输入 | 实测 |
| --- | --- |
| `` `a${ {x:1} }b` `` | `TemplateSpan` 里是 `ObjectLiteralExpression`；外层只有一个内插 |
| `` `a${`b${c}d`}e` `` | 内层是完整的 `TemplateExpression`（`TemplateHead[4,8)` … `LastTemplateToken[9,12)`） |

这两条现在的词法器已经能过（§2.4 实测），因为内插单元自带 basic 队列、`{` 会落成 `Bracket`、嵌套反引号会落成新的 `String`。**本轮不用动内插内部的配对机制。**

---

## 2. 现状：三处代码各做了什么

> 本节记录的是**改动前**的字段名与默认值；本轮已落地的配置面改动见 §0.4。

### 2.1 `StringTemplate`（`core/syntax/templates/string-template.xl.md`）——默认是 C#

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `Quotes` | `['"']` | 起一个字符串的字符 |
| `EscapeChars` | `['\\']` | 转义符（**注意：当前产物里没人读它**，`String.Default` 把 `\` 写死了） |
| `VerbatimPrefix` | `"@"` | `@"…"` 的前缀 |
| `InterpolationPrefix` | `"$"` | `$"…"` 的前缀 |
| `HasVerbatim` | `true` | 有 `@"…"` |
| `HasInterpolation` | `true` | 有 `$"…"` |
| `HasRaw` | `true` | 有 `"""…"""` |

`TypescriptTemplate.Create`（`typescript/run/typescript-template.xl.md` L48–51）把 ts 补成：

```ts
template.StringTemplate.Quotes = ['"', "'", "`"];
template.StringTemplate.HasVerbatim = false;
template.StringTemplate.HasInterpolation = false;
template.StringTemplate.HasRaw = false;
```

于是 **ts 的模板里没有任何「内插」开关是打开的**——ts 的 `${}` 只能从「三个开关全关」的那条兜底路径里挤出来。

### 2.2 `StringGuide`（`core/syntax/basic-tokens/string/string-guide.xl.md`）——只认前缀

- `Transit`（L40–78）：当前字符在 `Quotes` 里才接手；从**前一个源码字符**开始往前回看，只有 `HasInterpolation` 打开才把 `$` 当前缀、`HasVerbatim` 打开才把 `@` 当前缀，逐个 `unit.Undo(i)`，并置 `IsSupportInterpolation` / `IsSupportVerbatim`、`InterpolationCount++`。
- `Navigate`（L139–180）：`!HasRaw && !HasVerbatim` 时（ts）开引号之后**立刻**换成 `String`，用开引号签入、把当前字符重放。所以 ts 三种引号都走这一条。
- `CreateString`（L113–125）：把 `IsSupportInterpolation` / `InterpolationCount` 等抄进 `String`。

⇒ ts 建出来的 `String` 永远是 `IsSupportInterpolation=False`、`InterpolationCount=0`。

### 2.3 `String.Default`（`core/syntax/basic-tokens/string/string.xl.md`）——七条路径 + 一条私活

按 `IsSupportInterpolation` / `IsSupportVerbatim` / `IsSupportRaw` 分七条（L164–173 的散文）。ts 落在**第 6 条「纯字符」**（L286–311），里面有一条专为 ts 加的特例：

```ts
} else if (value === "{" && source.Pre()?.Value === "$" && !Source.Same(source.Pre(), this.LastTranslateSource) && this.StringChar === "`") {
  this.InterpolationCount = 1;
  this.Undo(source.Pre()!);
  // …挂 InterpolationString，SignIn(source)
```

即：`$` 先当普通文本进常量块；下一个字符是 `{` 时，把 `StringChar` 写死成 `` ` ``、把 `$` 从常量块里退掉、把 `InterpolationCount` 临时改成 1，再挂内插单元。`LastTranslateSource` 那一格、以及 `Translate.DecodeClear` 里 `$` / `` ` `` 两个 case，都是为这条私活配套的。

### 2.4 实测：现状产物（用 `SourceFileRunner.Parse` + `Root.ToXmlString()`）

| 源码 | 现状 XML（省略 `SourceFileShape` 外壳） |
| --- | --- |
| `"x"` | `<String IsSupportInterpolation=False IsSupportVerbatim=False IsSupportRaw=False InterpolationCount=0 RawQuoteCount=1><ConstString>x</ConstString></String>` |
| `` `t` `` | 同上，`ConstString>t` |
| `` `a${b}c` `` | `IsSupportInterpolation=False … InterpolationCount=1`，`ConstString>a` + `<InterpolationString><Common>b</Common></InterpolationString>` + `ConstString>c` |
| `` `${a}` `` | **多一个空 `ConstString`**：`<ConstString></ConstString><InterpolationString>…` |
| `` `a${b}${c}d` `` | 两个内插之间**多一个空 `ConstString`** |
| `` `$${a}` `` | `ConstString>$` + 内插（字面 `$` 保住了，对） |
| `` `\${a}` `` | `ConstString>${a}`（不内插，对）——靠 `LastTranslateSource` 那条判据 |
| `` `a$b` `` / `` `a$` `` | 字面，对 |
| `` `a${ {x:1} }b` `` | 内插里是 `WrapSymbol` + `Bracket`，对 |
| `` `a${`b${c}d`}e` `` | 嵌套 `String` 也是 `IsSupportInterpolation=False InterpolationCount=1` |
| `$"{a}"` | **抛错**（`$` 落成 `Symbol`、`"…"` 落成普通 `String`，语句候选不认 `Symbol` 开头） |

**两个问题一眼可见**：

1. **字段自相矛盾**：`IsSupportInterpolation=False`，却又有 `InterpolationCount=1` 和 `InterpolationString` 子单元。任何按字段判形态的读者（形状层、XML 消费者）都会判错。
2. **空 `ConstString` 是私活的副产物**：`$` 先落常量再被退掉，常量块就空了。形状层要么逐个过滤空块，要么就得把空块当文本——两条路都不该出现。

### 2.5 结论：为什么只改那两个文件不够

`StringGuide` 只能决定「造一个什么样的 `String`」，**`${` 的第一个字符 `$` 是在 `String.Default` 里按字符吃掉的**。把 `IsSupportInterpolation` 置成 `True` 之后，`String` 会走**第 2 条路径**（`IsSupportInterpolation && !Verbatim && !Raw`，L202–224），而那一条现在是：

```ts
} else if (value === "{") {           // 见 { 就挂内插，不看 $
  // …挂 InterpolationString，SignIn(source)
} else { this.AppendToLastConstString(value, source, context); }
```

`$` 会原样进常量块、`{` 照旧开内插——`` `a${b}c` `` 的文本会变成 `a$` + 内插，**比现在还错**。所以 `String.Default` 必须跟着改（§4.3），`InterpolationCount` 的含义也要跟着定（§3.2）。

---

## 3. 目标语义：默认 = ts 形式

### 3.1 语言事实（`StringTemplate` 的新默认值）

| 字段 | 新默认 | 说明 |
| --- | --- | --- |
| `Quotes` | `['"', "'", "`"]` | ts 的三个引号 |
| `EscapeChars` | `['\\']` | 不变 |
| `HasVerbatim` / `VerbatimPrefix` | `false` / `"@"` | 保留能力，默认关 |
| `HasInterpolationPrefix` / `InterpolationPrefix` | `false` / `"$"` | **前缀式**内插（C# `$"…"`），默认关 |
| `HasInterpolationQuoteChars`（新增） | `true` | 有没有**引号内内插** `${…}`（ts 的模板串）；默认开 |
| `InterpolationQuoteChars`（新增） | `["`"]` | 哪些引号用 `${…}`；只在上一格打开时生效，默认预置反引号 |
| `HasRaw` | `false` | 保留能力，默认关 |

`TypescriptTemplate.Create` 里那四行字符串覆盖**已删除**；它只剩 basic 队列、符号组合、数字后缀、正则四件事。

**副作用（风险很小）**：`new Template()` 从此就是 ts 形式。全仓唯一还按「默认模板 = C#」写的地方是 `cjcli.xl.md`（它 `new Template()` 后直接解析），而它现在连依赖都失效了（§0.3），没有活消费者；如果以后要留 C# 模板，必须在那份语言模板里显式打开 `HasVerbatim` / `HasInterpolationPrefix` / `HasInterpolationQuoteChars` / `HasRaw`。

### 3.2 ts 串 → `String` 字段矩阵（XML 口径）

| 源码 | `IsSupportInterpolation` | `InterpolationCount` | `IsSupportVerbatim` | `IsSupportRaw` | `RawQuoteCount` |
| --- | --- | --- | --- | --- | --- |
| `"x"` / `'x'` | False | 0 | False | False | 1 |
| `` `t` `` | **True** | **1** | False | False | 1 |
| `` `a${b}c` `` | **True** | **1** | False | False | 1 |

即：**`IsSupportInterpolation=True` ⇔ 模板串**（ts 里没有别的串形态会置这一格）。「有没有内插」不看 `InterpolationCount`，看 `String` 下有没有 `InterpolationString` 子单元——这样 `` `t` `` 与 `` `${a}` `` 只差子单元，不差字段。

`InterpolationCount=1` 的含义从「`$` 的个数」变成「**一个内插由一个 `{` 开启**」——`InterpolationExitGuide` 正是按这一格数 `}`（`core/syntax/basic-tokens/string/interpolation-exit-guide.xl.md` L57–74），所以必须置 1。

### 3.3 目标产物（改完后的 XML）

| 源码 | 期望 |
| --- | --- |
| `` `t` `` | `IsSupportInterpolation=True … InterpolationCount=1` + `ConstString>t` |
| `` `a${b}c` `` | 同上 + `ConstString>a` + `InterpolationString><Common>b` + `ConstString>c` |
| `` `${a}` `` | 同上，**没有空 `ConstString`**：直接 `InterpolationString><Common>a` |
| `` `a${b}${c}d` `` | 两个 `InterpolationString` 相邻，**中间没有空 `ConstString`** |
| `` `$` `` / `` `$${a}` `` | `ConstString>$`（+ 内插） |
| `` `\${a}` `` / `` `a$b` `` | 整段字面，不内插 |
| `` `a${ {x:1} }b` `` | 内插里嵌套 `Bracket`（与现状一致） |
| `` `a${`b${c}d`}e` `` | 嵌套模板串同样是 `True/1` |

### 3.4 内插单元的区间口径（形状层轮已按此落地）

`InterpolationString` 维持现状：从 `{` 签到 `}`（不含引号前的 `$`）。按这个口径，测出来的 ts 区间可以这样拼（`String` 的闭区间转成 AST 的半开区间）：

| ts 节点 | 区间 | 文本来源 |
| --- | --- | --- |
| `NoSubstitutionTemplateLiteral` | `[String.start, String.end+1)` | 唯一 `ConstString` 的 `Temp` |
| `TemplateHead` | `[String.start, 第 1 个内插.start+1)` | 内插前那段 `ConstString`；没有就是 `""` |
| `TemplateMiddle`（第 i 段） | `[内插ᵢ.end, 内插ᵢ₊₁.start+1)` | 两段内插之间的 `ConstString` |
| `LastTemplateToken` | `[最后内插.end, String.end+1)` | 最后一段 `ConstString`；没有就是 `""` |
| `TemplateSpan`（第 i 段） | `[内插ᵢ.start+1, 段末)` | 表达式由内插的子单元建 |

验算：`` `a${b}c${d}e` `` 里 `{` 的下标是 3 / 8、`}` 是 5 / 10、String 是 `[0,12]` → head `[0,4)`、middle `[5,9)`、tail `[10,13)`，与 §1.1 实测**逐位相同**。所以**不需要把 `$` 塞进 `InterpolationString` 的区间**（决策点 D4）。

---

## 4. 改造方案

### 4.1 `StringTemplate`：字段与默认值

`core/syntax/templates/string-template.xl.md` 改成：

```text
# class StringTemplate
## field Quotes:Array<string> = ['"', "'", "`"]
## field EscapeChars:Array<string> = ['\\']

## field VerbatimPrefix:string = "@"
## field HasVerbatim:bool = false

## field InterpolationPrefix:string = "$"        // 前缀式（C# $""）的字符
## field HasInterpolationPrefix:bool = false     // 前缀式内插，默认关（ts 没有）

## field HasInterpolationQuoteChars:bool = true  // 引号内内插 ${...}，默认开（ts）
## field InterpolationQuoteChars:Array<string> = ["`"]  // 哪些引号用 ${...}

## field HasRaw:bool = false
```

命名说明：`HasInterpolationPrefix`（前缀式）/ `HasInterpolationQuoteChars` + `InterpolationQuoteChars`（引号内式）是两组独立开关；`InterpolationQuoteChars` 默认预置反引号，由 `HasInterpolationQuoteChars` 闸门控制是否生效。开头 `${` 两字符是 **ts 引号内内插的固定形态**，不再单独配置。

### 4.2 `StringGuide`：内插标志改由引号决定

`Transit` 在现有逻辑上加一段（位置：建出 `item` 之后、`unit.Add(item)` 之前）：

```ts
const config = unit.Template.StringTemplate;
if (!config.Quotes.includes(source.Value)) {
  return BranchStates.Undo;
}
const item = new StringGuide(unit.Template, source.Value);
// 新增：引号式内插 —— 这个引号起的串，${ 就是内插
if (config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(source.Value)) {
  item.IsSupportInterpolation = true;
  item.InterpolationCount = 1;
}
// 原有：前缀回看（只有 HasInterpolationPrefix / HasVerbatim 打开时才认 $ / @）
```

- 默认模板下 `HasInterpolationPrefix=false`，回看循环一个字符都不认，`$"…"` 不会被误当字符串起点。
- **ts 形态不建向导**：`Transit` 在 `!HasRaw && !HasVerbatim` 时直接 `item.CreateString(false, 1)`、加进 `Data`、签入开引号，后续字符全归 `String`；`Navigate` 里原来的 ts 分支删掉（只剩逐字 / 原始串的三条）。这样 EOF 处不会留下未决向导，也不需要判断「这是不是最后一个字符」。
- 散文（L28–38、L82、L90）要跟着改：`InterpolationCount` 不再是「几个 `$`」，而是「一个内插几个 `{`」（ts 恒 1）；`IsSupportInterpolation` 是「这个串的形式带内插」。
- 若将来某语言同时有前缀式与引号式，约定：前缀回看只对**不在** `InterpolationQuoteChars` 里的引号生效（本轮不实现该组合，只在散文里写清假设）。

### 4.3 `String.Default`：第 2 条路径承接 ts，第 6 条路径去掉私活

**第 2 条路径**（`IsSupportInterpolation && !Verbatim && !Raw`）改成按「内插形态」分两式，`${` 的判定**不向后看**：

```ts
const config = this.Template.StringTemplate;
const quoteInterpolation = config.HasInterpolationQuoteChars && config.InterpolationQuoteChars.includes(this.StringChar);
// 转义分支略（Accept / Append / DecodeClear）
} else {
  if (this.PendingInterpolation !== null && quoteInterpolation && value === "{") {
    // 上一格是 $、这一格是 {：开内插
    this.PendingInterpolation = null;
    // …关上一个常量块、Add(InterpolationString)、MountedUnit、SignIn(source)
  } else {
    if (this.PendingInterpolation !== null) {
      // 上一格的 $ 后面不是 {：补落成字面 $
      const begin = this.PendingInterpolation;
      this.PendingInterpolation = null;
      this.AppendToLastConstString("$", begin, context);
    }
    if (config.EscapeChars.includes(value)) {
      this.Translate.IsTranslating = true;
    } else if (quoteInterpolation && value === "$") {
      this.PendingInterpolation = source;   // 只记位置，不看下一个字符
    } else if (!quoteInterpolation && config.HasInterpolationPrefix && value === "{") {
      // 前缀式：挂 InterpolationGuide，按 InterpolationCount 数 `{`
    } else if (quoteInterpolation && value === "\r") {
      this.AppendToLastConstString("\n", source, context);
    } else if (quoteInterpolation && value === "\n" && source.Pre()?.Value === "\r") {
      // CRLF 的后半：CR 已经按 `\n` 归一
    } else {
      this.AppendToLastConstString(value, source, context);
    }
  }
}
```

要点：

- **不向后看、不取文档级全局信息**：`$` 只把位置记进 `PendingInterpolation`，下一个字符到来时才决；唯一的位置回溯是 CRLF 后半的 `source.Pre()`（本地一格，向后）。
- **不产生空常量块**：`$` 在 pending 期间不落常量，`` `${a}` `` 直接就是 `InterpolationString` 开头。
- **close 时补落**：`$` 后面直接收尾（闭引号走 `ExitOrPre`、文件结束走 `Close`）时，这两个 close 点把挂着的 `$` 补进常量块——不预看也能得到 `a$` 的文本（含 `` `a$ `` 停在 EOF 的情形）。
- **`\${` 自然正确**：解码出来的 `$` 走 `Translate` 分支、不进 pending，后面 `{` 只是字面量。
- **`$${a}`**：第一个 `$` 只记位置；第二个 `$` 到来先补落第一个、再记第二个；`{` 到来时补落/开内插的分支自然得出「字面 `$` + 内插」。
- **私活搬走**：第 6 条路径（纯字符）删成「转义 + 收常量」，`StringChar === "`"` 与 `LastTranslateSource` 两条判据一并删除。

第 5 条路径（`Interpolation + Raw`，只有 C# 家族用）不动；前缀式在 ts 下默认关闭，路径 2 的前缀分支只为兼容保留（见 D1）。

`String` 的散文（L27、L55、L166–172）相应改成「第 2 条分前缀式 / 引号式两小支」。

### 4.4 `InterpolationString` / `InterpolationExitGuide` / `Translate`

**不改**。理由：`{…}` 内的配对、`}` 的退出、`\` 的解码都已经对（§2.4 的嵌套 / 转义探针全过）；本轮只换「谁开内插、`$` 归谁」。

### 4.5 `TypescriptTemplate`：删四行

```ts
- template.StringTemplate.Quotes = ['"', "'", "`"];
- template.StringTemplate.HasVerbatim = false;
- template.StringTemplate.HasInterpolationPrefix = false;
- template.StringTemplate.HasRaw = false;
```

散文 L11 改成「默认值就是 ts 形式；`StringTemplate` 只有在要给别的语言时才覆盖」。同时删掉「ts 的反引号内插不归它管」这类已经过时的说法。

### 4.6 文档与注释

| 位置 | 改什么 |
| --- | --- |
| `README.md` L131 | 已知缺口里「模板字符串…产物不对」要改写：词法层改完后**产物对的是 token 层**；形状层七页已在后续轮补齐（`string.ts` 75/75） |
| `docs/expression-ast-analysis.md` §4.1 | 决策点的结论可以注明「选 (b) 的变体：不新增 basic token，用 `String` 现有字段区分；见本页」 |
| `string-template.xl.md` / `string-guide.xl.md` / `string.xl.md` 散文 | 按 §4.1–4.3 更新（「默认是 C#」→「默认是 ts」） |

---

## 5. 决策点（需要用户拍板）

| 编号 | 问题 | 建议 |
| --- | --- | --- |
| D1 | **前缀式 `$"…"` 还留不留？** | 留，默认关（`HasInterpolationPrefix=false`）。它只影响 C# 家族；删掉会动路径 1 / 3 / 5 与 `VerbatimQuoteGuide` / `RawQuoteExitGuide`，超出本轮 |
| D2 | ts 下写 `$"{a}"` 要不要报错？ | 不处理。它现在是 `Symbol` + 普通 `String`，形状层报「没有候选」；真要支持是另一个语言特性，不是模板串 |
| D3 | ~~`${` 的判定方式~~（已按「延迟一格 + close 补落」落地） | `$` 只记位置、下一个字符才决；`$` 后直接收尾时在 `ExitOrPre` / `Close` 补落——**不向后看、不取文档级全局信息** |
| D4 | ~~`InterpolationString` 区间~~（已按 `{…}` 落地） | `{…}`：形状层 `head/middle end = 内插.start+1`、`tail start = 内插.end`，与 ts 实测逐位吻合 |
| D5 | ~~没有 `${` 的模板串字段取值~~（已按 `True/1` 落地） | `True` / `1`（形态判据）；形状层用「有无 `InterpolationString` 子单元」分 `NoSubstitution` / `TemplateExpression` |
| D6 | XML 要不要新增 `IsTemplate` / `Kind` 字段？ | 不加。`IsSupportInterpolation=True` 在 ts 模板里与「是模板串」等价；新增字段会让 C# 家族的 XML 也跟着膨胀 |
| D7 | 顺手修 `\uXXXX`（少收一位）/ `\xNN`（不认）/ `\u{…}` / `\{` 这类 NonEscapeCharacter？ | 另开一轮。它们挡的是「真实代码里的模板串」，但不属于 `${}` 判据；混进来会让本轮验收面失控 |
| D8 | 顺手修「未闭合模板串不报错、`StringGuide` 漏进 `Data`」？ | 另开一轮。`` `a${b `` 现在会把一个 `StringGuide` 留在 `InterpolationString.Data` 里（§2.4）；这是 EOF/错误路径，与本轮判据正交 |
| D9 | `EscapeChars` 字段没人读（`String` 写死 `\`），是否一并接上？ | 另开一轮或不做；本轮只在散文里记一笔，避免改动面扩散 |
| D10 | ~~新字段命名~~（已定） | 用户已定：`HasInterpolationPrefix`（前缀式）/ `HasInterpolationQuoteChars` + `InterpolationQuoteChars`（引号内式），默认 `true` + `["`"]`；开头 `${` 不再单独配置 |

---

## 6. 改动清单（按依赖顺序）

**本轮已落地 #1–#4；#5 只改了 README（`docs/expression-ast-analysis.md` 的注记未动）。**

| # | 文件 | 改动 | 依赖 |
| --- | --- | --- | --- |
| 1 | `core/syntax/templates/string-template.xl.md` | ✅ 默认改 ts；`HasInterpolation` 改名 `HasInterpolationPrefix`；新增 `HasInterpolationQuoteChars=true` / `InterpolationQuoteChars=["`"]` | — |
| 2 | `core/syntax/basic-tokens/string/string-guide.xl.md` | ✅ 按 `HasInterpolationQuoteChars` + `InterpolationQuoteChars` 置 `IsSupportInterpolation` / `InterpolationCount`；散文更新 | 1 |
| 3 | `core/syntax/basic-tokens/string/string.xl.md` | ✅ 第 2 条路径按形态分两支（`${` 预览 + `PendingInterpolation`）；第 6 条私活与 `LastTranslateSource` 已删；散文更新 | 1、2 |
| 4 | `typescript/run/typescript-template.xl.md` | ✅ 删四行字符串覆盖；散文更新 | 1 |
| 5 | `README.md` + 本页 + `docs/expression-ast-analysis.md` 的一句结论 | ✅ README 已知缺口已改写；形状层落地后再补一句结论 | 1–4 |

**不改**：`InterpolationString`、`InterpolationExitGuide`、`InterpolationGuide`、`RawQuoteExitGuide`、`VerbatimQuoteGuide`、`Translate`、`Template`（字段已在）、`String.ToXmlString`（五个属性不动）。

---

## 7. 验收

### 7.1 基线

```bash
node typescript/cases/ast-json-diff.mjs    # 形状层落地后：782 / 782（string 75 / 75）；token 轮当时是 741 / 782
node tests/parse/validate.mjs              # 仍是 1707 / 1707
node node_modules/typescript/bin/tsc -p tsconfig.json   # 0 error
node tmp/verify-string-tokens.mjs          # 词法层 18 / 18
```

`typescript/cases/string.ts` 75 条（**形状层轮之后已全绿**）：S1 / S2 / S7 是普通字符串、转义、多语句与 trivia；S3–S6 是模板串，
后来由形状层补齐（七页模板形状的 `Text` / `FromBasicToken` + `ExpressionBuilder` 的模板分支），41 条已全部转绿。
`StringLiteralShape` 读的是 `ConstString.Temp`，普通 `"…"` 串的路径没动，所以旧 707 条一条不变。

### 7.2 词法层逐条探针（已全绿）

用 `tmp/verify-string-tokens.mjs` 逐条断言 §3.3 的表（`SourceFileRunner.Parse` + `Root.ToXmlString()`），`tmp/dump-xml.mjs` 打原始 XML。探针不往上提交：等形状层落地后由 `typescript/cases/string.ts` 接替度量。

```text
`t`            → String True/1 + ConstString t
`a${b}c`       → String True/1 + ConstString a + InterpolationString(Common b) + ConstString c
`${a}`         → String True/1 + InterpolationString(Common a)          ← 无空 ConstString
`a${b}${c}d`   → True/1 + a + 内插 + 内插 + d                            ← 无空 ConstString
`$`            → True/1 + ConstString $
`$${a}`        → True/1 + ConstString $ + 内插
`\${a}`        → True/1 + ConstString ${a}
`a$b`          → True/1 + ConstString a$b
`a${ {x:1} }b` → True/1 + 内插里 Bracket
`a${`b${c}d`}e`→ True/1，嵌套 String 也是 True/1
`a$`           → True/1 + ConstString a$
"x" / 'x'      → False/0（不变）
$"{a}"         → 仍是 Symbol + String（ts 不支持前缀式；形状层报错属预期）
```

### 7.3 构建链

```bash
# 只重建动过的三处规范（避免被 cjcli.xl.md 那两条失效依赖挡住）：
#   xl 的定向构建，paths 只给下面三处
#   core/syntax/basic-tokens/string
#   core/syntax/templates
#   typescript/run
node_modules/.bin/tsc
node tmp/dump-xml.mjs
```

> `xl build` 全量现在会因为 `cjcli.xl.md` 依赖 `./dawn/text/*` 报 `E1006`（`dawn/` 已不在本分支），与本次改动无关；验收用上面的定向构建。

### 7.4 不在本轮

- 七个模板形状（`NoSubstitutionTemplateLiteral` / `TemplateHead` / `TemplateMiddle` / `TemplateTail` / `TemplateExpression` / `TemplateSpan` / `TaggedTemplateExpression`）的 `FromBasicToken` / `Text` / 投影 —— 本轮只保证 token 层能给出 §3.4 的区间口径。
- `expression.ts` 末尾「暂缓」里那两条模板用例、`regex.ts` 里的标签模板用例 —— 形状层轮已可建，待收进语料。
- `\uXXXX` / `\xNN` / `\u{…}`、未闭合模板串的报错（D7 / D8）。

---

## 8. token 层缺口（P0/P1/P2 已补；形状层轮之后只剩「未闭合内插 / 空内插的恢复树」）

### 8.1 已补：P0 / P1（转义与换行，以 ts 的 cooked text 为准）

`Translate` 重写成 ts 的 **cooked text** 口径：新增 `Accept`（这个字符还属于当前转义吗）与 `IsHex`（`Number.parseInt` 会静默截断，十六进制先校验），`Append` / `DecodeClear` 按 ts 的转义文法重写；`String` 的两条转义路径（第 2 条 / 第 6 条）改成「`Accept` → `Append` → `DecodeClear`」，转义不再属于当前字符时就结算上一个转义、再把当前字符 `ReloadMessage` 重放。

| 类别 | 输入 | ts 实测 | 现在 |
| --- | --- | --- | --- |
| `\uXXXX` 少收一位 | `"\u0041"` | `"A"` | ✅ `"A"` |
| `\xNN` 没进转义表 | `"\x41"` | `"A"` | ✅ `"A"` |
| `\u{…}` extended | `"\u{1F600}"` | `"😀"` | ✅（`fromCodePoint`，可 > `0xFFFF`） |
| 代理对 / 孤立代理 | `"\uD83D\uDE00"`、`"\uD800"` | `"😀"`、`"\ud800"` | ✅ |
| NonEscapeCharacter | `"\a"` / `"\d"` / `"\{"` / `"\ "` | `a` / `d` / `{` / 空格 | ✅ |
| 八进制 | `\0` `\1` `\07` `\08` `\39` `\101` `\377` `\400` `\477` | NUL / BEL / `A` / ` 0` / `'7` … | ✅ `text` 与 ts 一致（ts 的「不允许八进制」诊断本仓没有诊断通道，不收） |
| `\` + 续行 | LF / CR / CRLF | 不产出字符 | ✅ |
| 模板内真 CRLF / CR 归一 | `` `a<CRLF>b` `` | `"a\nb"` | ✅ `"a\nb"` |

验收集：`tmp/verify-escapes.mjs` **51 / 51**（含下面 P2 的非法转义恢复）；`string.ts` 的 S2 补了 8 条无诊断的转义写法（`\u0041` / `\x41` / `\u{1F600}` / 代理对 / `\a` / `\d` / `\{` / `\ 空格`），全绿。

### 8.2 已补：P2（错误路径，按 ts 的恢复口径）

| 类别 | 输入 | ts 实测 | 现在 |
| --- | --- | --- | --- |
| 非法 `\x` / `\u` 的恢复 | `"\uZZZZ"`、`"\x4Z"`、`"\x"`、`"\u12"`、`"\u{}"`、`"\u{110000}"` | 报诊断，但 `text` 保留原文 | ✅ 返回 `"\\" + Temp`（`Accept` 只认十六进制位，坏在哪个字符上就在哪里结算）；`"a\n\x4Z"` 的 `text` 是 `a\n` + 原文 `\x4Z`，与 ts 一致 |
| 停在 EOF 的孤立引号 | `"`、`'`、`` ` ``、`` `a${b` `` | 产出空 `StringLiteral` / `FirstTemplateToken` | ✅ ts 形态在 `Transit` 直接造 `String`、不建向导，所以 EOF 处本来就没有未决向导（不需要判断「是不是最后一个字符」） |
| `$` 后直接收尾 | `` `a$` ``、`` `a$ ``、（`$` 后接转义 / CRLF） | 字面 `$` + 后续字符 | ✅ `ExitOrPre` / `Close` 两个 close 点把挂着的 `$` 补落进常量块 |
| 未闭合内插 / 空内插 | `` `a${b ``、`` `${}` `` | 报诊断并恢复出 `LastTemplateToken` / 空 `Identifier` | token 树已按恢复口径：`InterpolationString` 未关闭 / 为空；**合成那两个节点是形状层的活**（参考区间见 §1.1） |

### 8.3 已补：模板可控性

- **前缀式内插受模板控制**：`String.Default` 第 2 条路径不再「见 `{` 就开」——只有 `HasInterpolationPrefix` 打开、且当前引号不在 `InterpolationQuoteChars` 里时，才挂 `InterpolationGuide`，由它按 `InterpolationCount`（前面 `$` 的个数）数连续左花括号；`$$"{{a}}"` 按 count=2 开一层内插。默认模板里前缀式是关的，`$"{a}"` 仍是 `$` + 普通字符串。
- **`EscapeChars` 受模板控制**：`String` 的两条转义路径（普通串 / 模板串）都改成读 `StringTemplate.EscapeChars`，不再写死反斜杠。把 `EscapeChars` 换成 `["@"]` 时，`"a@nb"` 解出换行、`"a\\b"` 里的反斜杠变普通字符，模板串同样生效。

验收集：`tmp/verify-template-config.mjs` **8 / 8**（自定义 `Template` + 探针根单元，覆盖默认/前缀式/count=2/换转义符）。

**两条硬约束（本轮遵守）**：token 层**不向后看、不取文档级全局信息**——`$` 只把位置记进 `PendingInterpolation`，下一个字符到来才决；不读 `source.Index` / `Document.GetCount` / `Document.GetValue`，唯一的位置回溯是 CRLF 后半的 `source.Pre()`（本地一格，向后）。`tmp/verify-no-lookahead.mjs` 对 6 个字符串源文件做模式检查，**6 / 6**。

### 8.4 剩余

| 项 | 说明 |
| --- | --- |
| 未闭合内插 / 空内插的**恢复树** | token 层已给出未关闭的 `InterpolationString` / 空 `InterpolationString`；形状层要按 ts 的恢复合成 `LastTemplateToken`（空、区间在 EOF / `}` 处）与空 `Identifier[3,3)` |
| 诊断通道 | ts 会为非法转义、未闭合模板报 diagnostics；本仓没有诊断列表，只保证 `text` / token 树与恢复结果对齐 |
| C# 家族的 `{{` 转义语义 | 现在交给既有的 `InterpolationGuide`；ts 没有前缀式，无法对拍，等有 C# 参考再验 |
| raw / verbatim 家族在 EOF 的向导 | `@"` / `"""` 停在 EOF 时仍可能留下未决向导（这两种形态必须看下一个字符数引号）；ts 用不到，等有需要的语言再补 |

已对齐、不用动：`\0` / `\1` 单字符八进制、`\` + LF 续行、`$${a}` / `\${a}` / `\\${a}` / `a$b` / `$` 后不跟 `{`、嵌套 `{}`、嵌套模板。

**关于标签模板**：token 层**不需要**再做什么。`tag\`t\`` 的 token 树是 `Common(tag)` + 带 `IsSupportInterpolation=True` 的 `String`，与 ts 的 `TaggedTemplateExpression` 结构一一对应；ts 甚至允许 tag 与模板之间换行（实测 `tag\n\`t\`` 的 `diagnostics=0`）。它现在崩在「表达式语句没有读完」，是 `ExpressionBuilder` / 语句形状的账。

探针：`tmp/verify-escapes.mjs`（P0/P1/P2 的 51 条转义 / 换行断言）、`tmp/verify-p2-eof.mjs`（EOF 孤立引号 5 条）、`tmp/verify-template-config.mjs`（前缀式 / `EscapeChars` 受模板控制 8 条）、`tmp/probe-token-gaps.mjs`、`tmp/probe-texts.mjs`、`tmp/probe-token-tree.mjs`。这些仍是临时脚本——要把 token 层纳入回归，得把它们落成一个正式尺子（`string.ts` 只比 AST，看不见 token 层）。
