# basic token 场景清单（逐场景 case files / 根因 / 解决思路 / 验收）

本文件把 `docs/token-ast-analysis.md` §5 的「basic token 待用户裁定」拆成**可执行清单**：
每个场景写清**受影响的 case 文件（最新主仓实测）**、最小复现、根因（精确到文件:方法:行）、
方案 A（改 basic token 层）/ 方案 B（typescript 层绕过）、推荐项、验收标准，以及**要用户裁定的一句话**。

**结论先行**：最终主仓 `b579c490`（Plan A + 场景 2/3/4/5 已合入）读数 **1645/38/9/10/1**，剩余 **47 = 38 crash + 9 diff**；
本清单 7 个场景里 **实测仍红 1 份**（`lex-bom.ts`：BOM 在 raw index 109，index-0 规则不覆盖，三条候选待用户裁定）；`/`、`$`、`\uXXXX` 4 位形、shebang 已转 PASS；`\u{…}` 花括号形仍单列缺。
`>>` 场景的 1 份（`expressions/ex-angle-cast.ts`）属**口径项**且已绿（现 PASS），若计入 basic-token 红为 2（剩余红 1 + `>>` 口径项 1）；
`async` 是口径注记、当前无失败文件。
**场景 2/4/5 已按用户批准改 core（符号表移除 `$` / 新增 `Bom`+`Shebang` basic token）；1 用 core 现有 `RegexStartAfter` 接口；6 保持 token 合符号；3 的 4 位形也已动 core。**

## 0. 读数基线（本克隆实测，非抄旧数）

```text
场景 2 已合入 round 12（merge `96eaadf2`；实现提交 `c8256876`）
xl_build core,typescript → 859 written / 0 error；tsc exit 0
node typescript/cases/token-ast.mjs --quiet
  → total=1703 ok=1645 crash=38 diff=9 ts-invalid=10 gap-now-passing=1
  → known-gap 3（diff 2 + gap-now-passing 1），non-known-gap 1700（ok 1645 / crash 38 / diff 7 / ts-invalid 10）
ast:cases：场景 1/2/3 后 4785；场景 4/5 活跃行加入后为 **4787/4787、0/0/0**
```

逐文件复测命令：`node typescript/cases/token-ast.mjs tests/cases/token/<子目录>/<文件>.ts`（失败时 exit 1）。

## 1. 控制头 `)` 之后 / 语句起点的 `/` 应判 `RegexToken` 而非除号（**已实施 Plan A**）

**受影响 case files（2，实测均为 crash，均无 `xl:known-gap`）**

| 文件 | 实测 | 消息 | xl:expect |
| --- | --- | --- | --- |
| `tests/cases/token/expressions/expr-r1233-control-head-regex.ts` | CRASH | 不支持的表达式起点 | 见文件头（多档控制头 `/re/g;`） |
| `tests/cases/token/statements/stmt-if-body-regex-not-comment.ts` | CRASH | 不支持的表达式起点 | `IfSet:2,IfSegment:3,IfCondition:2,IfBody,IfStatement:2,RegexToken:2` |

**最小复现**：`if (a) /re/.test(x);`（对照：`if (/x/) {}` OK；`x = /re/.test(y);` OK；`a / b` OK）

**根因**（精确位置）：
- `core/syntax/basic-tokens/regex-token.xl.md:170-227` `Transit`：第二段「起点判据」先查
  `context.RegexStartAfter`（`:208-211`），否则问 `Template.RegexTemplate.CanStart(lastCode, previousCode)`（`:212`）；
  不成立就 `Undo`，`/` 落到符号层成为除号。
- 接口已在 core 里备好：`core/syntax/syntax-context.xl.md:33` `field RegexStartAfter:Set<int>`；
  `regex-token.xl.md:23` 明确写着「语法层可以否决」。
- 没接上的是**语法层登记**：`typescript/run/typescript-template.xl.md:52-67` 的 `ExpressionKeywords`
  只覆盖「前一个 token 是关键字」（`return` / `case` / `default` …），控制头 `)` 不在其中；
  表达式起点位置（`if (a) ⌷` / `else ⌷` / `do ⌷` / `after }`）没有候选去登记 `RegexStartAfter`。
- 报错出口：`typescript/tokens/expressions/expression-builder.xl.md:2023`「不支持的表达式起点」。

**方案 A（改 basic token 层）**：在语句/表达式候选里**表达式起点那一格**（控制头 `)`、`else`、`do`、
裸块 `}` 之后）把前一个代码单元的 `End.Index` 注册进 `context.RegexStartAfter`，让下一字符 `/` 的
`RegexToken.Transit` 直接成立（即 TS 的 `reScanSlashToken` 等价物）。机制已存在，**不需要新 core API**；
影响面：所有 `/` 起点判定共用一条路径；回归网：`a / b`、`(a) / b`、`a /* c */ / b`、`/a/` 字面量（用例在
`typescript/cases/` 与 token 语料里已有）。
**方案 B（不改 token 的 typescript 层绕过）**：维持现状，在语料把 `if (a) /re/…` 声明为不支持、改期望标签。
代价：与 TS 行为永久不一致，且 `expr-r1233` 的多档控制头全部要改。**不推荐**。

**已实施（Plan A，用户批准加宽判据输入）**：`RegexTemplate` 新增 `CanStartAt(units,index)`（默认回扫 trivia 后委托 `CanStart`）；`RegexToken.Transit` 改调 `CanStartAt(data, data.length)`（`RegexStartAfter` 检查保留最前，字段/依赖未删）；ts 模板 `TypeScriptRegexTemplate.CanStartAt` 覆写补三类位置判据——控制头 `)`（`if/while/for/with`，排除 `obj.while(a)` 成员调用）、`else`/`do` 关键字尾、语句块尾（值位花括号排除）。
改动文件：`core/syntax/templates/regex-template.xl.md`、`core/syntax/basic-tokens/regex-token.xl.md`、`typescript/run/typescript-template.xl.md`；无其它 core 改动，语言词表没有写进 core。

**验收（已实测达成）**：上表 2 份转 PASS；`expr-r1232` / `expr-r1234` 守卫仍 PASS；嵌套 `function f(){ if (a) /re/.test(x); }`、`class C{ m(){ if (a) /re/.test(x); } }` PASS；`expr-r1233` 的 10 条对照仍为除号；token 读数 ok 1636→**1638**、crash 47→**45**、diff 9 **不变**；ast:cases 4774/4774、0/0/0。
`typescript/cases/basic-token.ts` 候选活跃行：`if (a) /re/.test(x);`、`for (;;) /re/g;`。

**需用户裁定**：允许按「表达式起点位置」把 `/` 改判成 `RegexToken`（用 core 现有 `RegexStartAfter`，不改 core 代码）吗？

## 2. `$` 作标识符字符（**已实施**：用户指定从 core 符号表直接移除 `$`，非 per-language `Ban`）

**受影响 case files（3，均 crash，均无 known-gap）**

| 文件 | 实测 | 消息 | xl:expect |
| --- | --- | --- | --- |
| `tests/cases/token/lexical/lex-ident-dollar-variable.ts` | **PASS**（原 CRASH：变量声明缺少标识符） | — | `Let` |
| `tests/cases/token/lexical/lex-ident-dollar-middle.ts` | **PASS**（原 CRASH：变量声明里有无法识别的单元） | — | `Let` |
| `tests/cases/token/lexical/lex-ident-dollar-interface.ts` | **PASS**（原 CRASH：缺少标识符） | — | `Interface,InterfaceBody,Field` |

**最小复现**：`const $x = 1`（另：`const a$b = 1`、`interface I$X { a: number }`）

**根因**：
- `core/syntax/templates/symbol-template.xl.md:67-113` `IsSymbol` 的内置表把 `$` 列为符号（`:102`）；
- `core/syntax/basic-tokens/common.xl.md:41-47` `IsAppend` 只要 `IsSymbol || IsWhiteSpace` 任一为真就拒收，
  于是 `$x` = `Symbol($)` + `Common(x)`；
- **模板已提供按语言禁用符号的开关**：`symbol-template.xl.md:49-56` `Ban(items)`（注释原话：某语言里其实是
  标识符字符时用它排除）；`typescript/run/typescript-template.xl.md:46-68` `Create` 目前只配了
  `AllowCombineSymbol` / 数字后缀 / 正则，没有 `Ban(["$"])`。
- `$"` 内插前缀与本场景不冲突：ts 模板的 `StringTemplate.HasInterpolationPrefix` 默认 **false**
  （`core/syntax/basic-tokens/string/string-guide.xl.md:42`），ts 的 `$` 在字符串里就是普通字符。

**已实施（用户指定方案 A′：core 符号表直接移除）**：`core/syntax/templates/symbol-template.xl.md` 的 `IsSymbol` 内置表**删掉 `case "$":` 一行**（其余表项与 `Ban` 机制不动；**没有**在 `typescript-template` 加 `Ban(["$"])`）。`$` 既非符号也非空白 ⇒ `Common.IsAppend` 收下，`$x`/`a$b`/`I$X` 各成一个 `Common`，`IdentifierShape` 正常投影（TS 的 `Identifier.text` 也是 `$x`）。

**依赖排查（全仓）**：① `AllowCombineSymbol` 列表（`typescript-template.xl.md:178`）不含 `$`；② `StringTemplate.InterpolationPrefix` 默认 `"$"`，但 ts 的 `HasInterpolationPrefix=false`（`string-template.xl.md:35`），`StringGuide` 回看分支不会触发，`$"…"` 本就不支持；③ 其它 `"$"` 字面量只在 `string.xl.md`（字符串扫描内部）、`import-*/statement-scanner`（标识符字符判定）里，均不依赖符号表。
**方案 B（历史备选，未采用）**：`typescript/run/typescript-template.xl.md` 的 `Create` 里加
`template.SymbolTemplate.Ban(["$"])`；`$` 既不是 symbol 也不是 whitespace ⇒ `Common.IsAppend` 收下，
`$x`/`a$b`/`I$X` 各成一个 `Common`，`IdentifierShape` 正常投影（TS 的 `Identifier.text` 也是 `$x`）。
代价：`$` 在任何模板配置下都按标识符字符处理——ts 本来如此；若将来要支持 C# 的 `$"…"` 形态，
**不要**在共享模板里 Ban，而应在本模板配置里 Ban（本方案已如此，`$"` 只可能出现在别的语言模板）。
风险：`$` 若出现在 TS 非法位置（如单独的 `$` 后接字符串）会变成标识符声明/表达式而不是词法错误，影响面小。

**推荐/已实施**：**方案 A（core 直接移除）**——用户拍板；影响面是「`$` 在所有语言里都不再是符号」（当前仓里只有 ts 模板在使用 `SymbolTemplate` 默认表）。

**验收（已实测达成）**：上表 3 份转 PASS；token 读数 ok 1640→**1643**、crash 43→**40**、diff 9 不变；`ast:cases` 4780→**4785**、0/0/0；`ast:dts` 226/226；探针 8 条（`const $x`、`a$b`、`I$X`、`const $`、`const $f = () => 1`、`$();`、`{ $x: 1 }`、`class C { $m() {} }`）AST text 与 TS 一致；字符串 `"$x"`、正则 `/$/`、`// $` 注释、`a / b`、数字/关键字行为与改前逐条一致；`$\"a\"` 仍 crash（消息由「不支持的表达式起点」变「表达式没有读完」，不要求支持）。

**用户裁定**：已批准直接从 **core** 的 `IsSymbol` 符号表移除 `$`（不走 per-language `Ban` 路线）；已按此实施并合入 round 12（merge `96eaadf2`；实现提交 `c8256876`）。

## 3. `\uXXXX` 转义标识符（**已实施**：4 位形已收，`\u{…}` 花括号形仍缺）

**受影响 case files（2，均 crash，均无 known-gap）**

| 文件 | 实测 | 消息 | xl:expect |
| --- | --- | --- | --- |
| `tests/cases/token/lexical/lex-unicode-escape-identifier.ts` | **PASS**（原 CRASH：变量声明缺少标识符） | — | `Let,Statement` |
| `tests/cases/token/lexical/lx-unicode-ident.ts` | **PASS**（原 CRASH：变量声明缺少标识符） | — | `Statement,Let` |

（`lx-unicode-ident.ts` 里 `const 变量 = 1`、`const café = 2` 两行是好的，只有 `const \u0061bc = 3` 崩。）

**最小复现**：`const \u0061bc = 1;`（TS 的 `Identifier.text` 是解码后的 `abc`）

**根因**：
- `core/syntax/templates/symbol-template.xl.md:92` 把 `\` 列为符号；`common.xl.md:46` 的 `IsAppend`
  拒绝符号 ⇒ `\` 单独成 `Symbol`，`u0061bc` 只是普通 `Common`，拼不成一个标识符；
- 目前只有字符串里的转义（`core/syntax/basic-tokens/string/translate.xl.md`），**标识符扫描没有转义规则**；
- 字符分类只由 `IsSymbol` / `IsWhiteSpace` 两张表决定（`symbol-template.xl.md:5`），没有「`\` + `uXXXX`
  合并解码」的通道。

**方案 A（改 basic token 层，推荐）**：在 core 的字符扫描里加「转义标识符」规则——
步骤：① `Common.IsAppend` / `Transit` 识别 `\` + `u` + 4 hex（`\u{…}` 另议）为一个标识符字符；
② 解码后进 `Temp`（或保留原文 + 新增解码字段）；③ `IdentifierShape.FromBasicToken` 取解码文本，
保证 AST `text` 与 TS 一致（`abc`）；④ 位置区间仍按原文（6 个字符）。影响面：Common 的字符吞并判据；
回归网：`\u0061bc`、`a\u0062c`、`\u{1F600}`（若支持）、非转义位置 `\` 仍应报错。新用例：token 语料 2 份 + `typescript/cases/basic-token.ts` 1 行。
**方案 B（typescript 层绕过）**：`typescript-template.xl.md` 里 `Ban(["\\"])` 让 `\` 落到 `Common`，
再在 `typescript/tokens/names/identifier-shape.xl.md` 的解码里把 `\uXXXX` 还原成目标字符。
代价：`\` 在非转义位置不再是符号（TS 里应报错），且 `a\b` 会被吞成一个标识符后由 AST 校验兜底；
属于「先收进来再纠错」，与词法错误位置会偏。**可行但语义不干净**。

**已实施（用户批准方案 A；已合入 round 10，merge `de94ec2a`，实现提交 `13896b7d`）**：5 个文件——① `core/syntax/templates/symbol-template.xl.md` 新增开关 `SupportUnicodeEscapeIdentifier`（默认 false）+ `IsHexDigit`；② `core/syntax/basic-tokens/common.xl.md` 新增 `static IsUnicodeEscapeStart(Src, template)`（`\`+`u`+4hex 前探）、`IsAppend` 接受该起点、`Transit` 的 `Undo` 闸门放行；③ `core/syntax/basic-tokens/symbol.xl.md` 的 `Transit` 在合法转义前返回 `Undo`（让 Common 接管）；④ `typescript/run/typescript-template.xl.md` 打开开关；⑤ `typescript/tokens/names/identifier-shape.xl.md` 新增 `DecodeIdentifierEscapes`，`EscapedText` 存解码值（区间仍取原文）。**`\u{…}` 花括号形未做**（需 Bracket 让位，单列剩余子项）。

**验收（已实测达成）**：上表 2 份转 PASS；token 读数 ok 1638→**1640**、crash 45→**43**、diff 9 不变；`ast:cases` 4774→**4780**、0/0/0；`ast:dts` 226/226；探针 5 条（`const \u0061bc`、`const a\u0062c`、`function f\u0066`、`class C\u0031`、`interface I\u0041`）AST text 与 TS 一致（解码后）；非法/边界（`\u00`、`\uZZZZ`、孤立 `\`、字符串 “\u0061”、`a / b`）行为与改前完全一致；`{ \u0061: 1 }` 属性键也随之一致。

**用户裁定**：已批准方案 A（core 改动按上面 5 个文件最小化实现；`Ban(["\\"])` 的兜底方案未采用）。`\u{…}` 花括号形是否继续做，需另行批准（它还要让 `Bracket.Transit` 在该状态让位）。

## 4. U+FEFF（BOM）作 trivia（**basic token 已实施：`Bom`，仅 source index 0；已合入 round 14，merge `b579c490`；实现提交 `ad1bd6a3`**；目标 fixture `lex-bom.ts` 的 BOM 在 raw index 109，仍红，三条候选待用户裁定）

**已实施（已合入 round 14，merge `b579c490`；实现提交 `ad1bd6a3`）**：新增 `core/syntax/basic-tokens/bom.xl.md`（`Bom extends UnitToken`，`IsBasicToken`/`IsTriviaToken`；`Transit` 只在 `source.Index === 0` 且字符在 `Template.BomChars`（默认 `U+FEFF`/`U+FFFE`）里认领，签入/签出后立即关闭；进 `Template.BasicBranchQueue` 最前）。**目标 fixture 不绿**：`lex-bom.ts` 的 U+FEFF 在 raw index 109（指令注释头之后），严格 index-0 规则不覆盖；三条候选见本节末。下面表格/步骤是实施前记录，保留作历史。

**受影响 case files（1，crash，无 known-gap）**

| 文件 | 实测 | 消息 | xl:expect |
| --- | --- | --- | --- |
| `tests/cases/token/lexical/lex-bom.ts` | CRASH | 表达式语句没有读完 | `Let` |

**实测补充**：该文件**第 0 字节不是 BOM**（文件头字节 `2F 2F 20` = `"// "`，`// xl:bom` 是语料指令）；
BOM 出现在**代码行行首**（`\uFEFFconst a = 1;`），第一个 token 被污染成 `Common("\uFEFFconst")`。

**最小复现**：`\uFEFFconst a = 1;`（U+FEFF 在 `const` 前）

**根因**：
- `core/syntax/basic-tokens/wrap-symbol.xl.md:48-54` `IsAppend` ⇒ `SymbolTemplate.IsWhiteSpace`；
  `symbol-template.xl.md:211` `IsWhiteSpace` 的空白字符表**不含 U+FEFF**；
- `common.xl.md:41-47` `IsAppend`：U+FEFF 既非 symbol 也非 whitespace ⇒ 被 `Common` 吞进 `Temp`，
  `const` 不再是关键字；
- `typescript/run/text-document.xl.md:31-40` `TextDocument` 构造**不剥 BOM**（这只能处理第 0 格；
  本用例的 BOM 在中间行，所以运行层单改不够）。

**三条候选（需用户裁定；旧的「方案 A / 方案 B」已废弃，统一按下面编号）**：

1. **(a) 改 fixture + parseDirectives**：把 `tests/cases/token/lexical/lex-bom.ts` 的 U+FEFF 移到 **raw index 0**，并让 `parseDirectives` 容忍 BOM（**需用户批准改语料**）。语义最干净：BOM 真的成为文件头 trivia。
2. **(b) 放宽 `Bom` token 的起始判据**：index 0 **或**「前面只有 trivia（尚无代码 token）」时也可认领。覆盖 `lex-bom.ts`（BOM 在指令注释之后、第一个代码 token 之前）；仍不把任意位置的 BOM 当空白。旧「方案 B（text-document 同长度替换）」等价于 (a) 的宽松版，已并入此条。
3. **(c) BOM 字符当空白（TS parity）**：在 `SymbolTemplate.IsWhiteSpace` / 空白判定里把配置的 BOM 字符当空白（任意位置），`Bom` token 仍只在 index 0。`ts.createSourceFile` 对 mid-file U+FEFF 也是 **0 诊断**，所以这条最贴近 TS；影响面是所有语言的空白表。

**推荐**：不替用户选；(b) 改动最小且只影响 BOM token 自身，(c) 与 TS parity 最一致，(a) 需要改语料。**token 已实现但 fixture 未转绿，按原规则（仅 index 0）提交**。

**验收（探针实测）**：直接 `SourceFileRunner.Parse("\uFEFFconst a = 1;")`（真 U+FEFF 在 index 0）解析成功，形状树与 `const a = 1;` 一致（CJ/TS 均 true）；BOM+shebang 见 §5。`lex-bom.ts` 仍 CRASH（BOM 在 raw index 109），待上述三选一。


## 5. shebang `#!` 作首行 trivia（**已实施：basic token `Shebang`，index 0 或 BOM.End+1；已合入 round 14，merge `b579c490`；实现提交 `ad1bd6a3`**）

**已实施（已合入 round 14，merge `b579c490`；实现提交 `ad1bd6a3`）**：新增 `core/syntax/basic-tokens/shebang.xl.md`（`Shebang extends UnitToken`，`IsBasicToken`/`IsTriviaToken`；吞到行尾 `\n` 之前、`\n` 用 `ReloadMessage` 交回根单元；不投 AST）。起始判据：无 BOM 时 `source.Index === 0`，有 BOM 时 `source.Index === Bom.SourceRange.End.Index + 1`；标记由 `Template.ShebangMarker` 配置（默认 `#!`）。进 `Template.BasicBranchQueue`（BOM 之后、注释/符号之前）。`lex-shebang.ts` / `lx-shebang.ts` 转 PASS。**BOM+shebang 超集**：`\uFEFF#!/usr/bin/env node\nconst a = 1;` 本实现解析 OK 且 AST 与无 shebang 版本一致；**TS 6.0.3 对该输入报 2 条 `parseDiagnostics`**，本实现按用户设计**有意接受**（超集）。下面表格/步骤是实施前记录，保留作历史。

**受影响 case files（2，均 crash，均无 known-gap）**

| 文件 | 实测 | 消息 | xl:expect |
| --- | --- | --- | --- |
| `tests/cases/token/lexical/lex-shebang.ts` | CRASH | 私有标识符缺少名字 | `Let,PreprocessorDirectives` |
| `tests/cases/token/lexical/lx-shebang.ts` | CRASH | 私有标识符缺少名字 | `Statement,Let` |

**最小复现**：`#!/usr/bin/env node` 换行 `const a = 1;`

**根因**：
- `symbol-template.xl.md:67-113` 的符号表含 `#`（`:101`）与 `!`（`:99`），shebang 行被拆成一串
  Symbol / RegexToken / Common；
- `core/syntax/templates/template.xl.md:86-100` 的 `BasicBranchQueue` 没有 shebang 分支；
- `typescript/tokens/trivia/shebang-trivia-shape.xl.md:9-19` 形状已存在，但
  `typescript/tokens/trivia/shebang-trivia-possible-shape.xl.md:13-25` 的 `ComputeByIndex` / `BuildByIndex`
  仍是 `throw new Error("…未实现")` 桩，也没进 SourceFile 的候选表；
- `#` 被表达式层当 PrivateIdentifier 前缀：`expression-builder.xl.md:1841-1856`（:1847 抛「私有标识符缺少名字」）。
- 证据：`#` 之后下一格是 `/`（RegexToken 或 Symbol），不是 `Common`，所以 expression 分支必抛。

**方案 A（改 basic token 层）**：新增 shebang basic token（只在文件第 0 格 `#`+`!` 时按行吞掉，产 trivia
不产 AST）并加进 `BasicBranchQueue`。需要新 basic token 类型（core）→ **必须用户裁定**。
**方案 B（typescript 层绕过，可行）**：实现 `ShebangTriviaPossibleShape.ComputeByIndex/BuildByIndex`
（扫描 root Data：第 0/1 格是 `Symbol(#)`+`Symbol(!)` 时 Accept，`BuildByIndex` 吞到行尾 `WrapSymbol` 的 `\n` 之前、
建 `ShebangTriviaShape` 后丢弃/当 trivia），并在 `typescript/tokens/files/source-file-shape.xl.md` 的候选表里接线。
代价：`#`/`!` 的 token 归类不变，靠候选在**首行**抢先收掉；行内其它 `#`/`!` 不受影响；风险限定在文件首。
注意 `lex-shebang.ts` 的 `xl:expect` 含 `PreprocessorDirectives`，若该标签要求 AST 节点，需先与 TS 对齐
（TS 的 AST 里 shebang 只是 trivia、无节点），建议按 TS 口径**不投影节点**。

**推荐**：**方案 B**（typescript 层，实现已有桩 + SourceFile 候选接线），不动 core；若用户认为 shebang
应在 token 层就成 trivia，再选 A。

**验收（已实测达成）**：2 份转 PASS；token 读数 ok 1643→**1645**、crash 40→**38**、diff 9 不变；`ast:cases` 加 2 条 shebang 活跃行后 4787/4787、0/0/0；`ast:dts` 226/226。
`typescript/cases/basic-token.ts` 候选活跃行：`#!/usr/bin/env node` + `const a = 1;`（两行一组）。

**用户裁定**：已按方案 A（core 新增 `Shebang` basic token）实施并合入 round 14（merge `b579c490`；实现提交 `ad1bd6a3`）。
若要求 token 层单列 `ShebangTrivia` basic token，则属于 core 改动、需要用户明确同意。

## 6. `>>` / `>>>` 是否在 token 层拆

**受影响 case files（实测 0 份仍红）**

- `types G2` 原代表文件 `expressions/ex-angle-cast.ts`（`const d = <Array<number>>y`）**本克隆实测已 PASS**
  （round-2 的表达式/类型侧修复后不再红）；扫描剩余失败列表，没有以 `>>` 为根因的文件。
- 因此本场景**当前不产生转绿收益**，只记录口径。

**最小复现（历史）**：`const d = <Array<number>>y`（对照：`<Array<number> >y` OK）

**根因（现状）**：
- token 层是**合符号**：`typescript/run/typescript-template.xl.md:49`
  `AllowCombineSymbol(["**","**=","<<",">>",">>>","<<=",">>=",">>>=", …])`，`>>` 是一个 Symbol 单元；
- types 侧已绕过：`typescript/tokens/types/type-builder.xl.md:1717` `IsSplitClose`（类型位把一个 `>>` 当两格 `>`）；
- expression 侧曾绕过一半：`expression-builder.xl.md:483` 与 `MatchAngleClose`（:1759-1761）写着
  「拆 `>>` 需要 basic token 决策」，这是历史崩溃点；round-2 后 `ex-angle-cast` 已绿。

**方案 A（改 basic token 层）**：token 层不把 `>>`/`>>>` 合成一个 Symbol，而是拆成单字符 `>` 序列，由
parser 按需重组成移位运算符。影响面最大：所有 `>>` / `>>>` / `>>=` / `>>>=` / 嵌套泛型收尾；需要同步改
`typescript/run/typescript-template.xl.md:49` 的合符号表、expression/type 两侧的重组判据，并重跑
`typescript/cases/operators.ts` 等 4622 条。
**方案 B（不改 token 层，表达式侧复用拆法）**：保持 `>>` 合符号，在 `expression-builder.xl.md` 的
`MatchAngleClose` / `CanStartTypeArgumentCall` 复用 `type-builder` 的 `IsSplitClose`（把合符号当两格 `>`）。
影响面限定在角度配对；不动 token 表，回归风险低。**ex-angle-cast 已绿说明现状已够用。**

**推荐**：**方案 B（保持 token 层合符号）**；除非用户明确要求「token 流里 `>` 永远单字符」，否则不拆。

**验收**：无文件需转绿（历史 1 份已绿）；token 读数不变（ok 1646 / crash 37 / diff 9）。
`typescript/cases/basic-token.ts` 候选活跃行（若决定 B 后可留作对照）：`const d = <Array<number>>y;`
（当前口径下已可 PASS）；拆 token 的方案 A 若实施需另加 `a >> b`、`a >>> b` 的对照行。

**需用户裁定**：`>>` / `>>>` 保持 token 层合符号（推荐，不动 core）吗？还是要求 token 层拆成单 `>`（core 改动）？

## 7. 附注：`async` 等上下文关键字的升级口径（无失败文件）

- 现状：`async` 是上下文关键字，只有紧跟 `function` / `(` 等语境才升级；`async` 换行/注释时按 `Identifier`
  （与 TS 一致）。相关写证：`statements/gap-sweep-newline-async-01.ts` / `gap-sweep-linecomment-async-01.ts`
  的文件头注记；关键字形状在 `typescript/tokens/keywords/async-keyword-*.xl.md`，升级表在
  `core/syntax/templates/keyword-template.xl.md`。
- 剩余失败里没有以 `async` 的 token 升级为根因的文件（本清单不计收益；若有同名 diff 属 D5 possible compute，不是 basic token）。
- 口径问题：**升级判据留在 token 层（KeywordTemplate）还是下放到 parser**？建议保持现状（token 层只做
  「这个词是不是关键字」的保守判定，语境升级由 parser 的形状候选决定），这样不需要改 core。

**需用户裁定**：上下文关键字（`async` / `abstract` / `declare` / `readonly` 等）的「语境升级」保持在 parser 侧
（不动 core）吗？

## 8. 汇总表

| # | 场景 | 实测仍红 case 数 | 要改的文件 | 是否 core | 推荐方案 | 预计转绿 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 控制头 `)` 后 `/` 判 RegexToken（**已实施**） | 0（已转 PASS） | `core/syntax/templates/regex-template.xl.md`（新增 `CanStartAt`）+ `core/syntax/basic-tokens/regex-token.xl.md`（改调用）+ `typescript/run/typescript-template.xl.md`（ts 覆写） | 是（入口加宽在 core，用户已批准） | A | 2（已转绿） |
| 2 | `$` 作标识符字符（**已实施**） | 0（已转 PASS） | `core/syntax/templates/symbol-template.xl.md`（删 `case "$":`，非 Ban） | 是（用户已批准） | A（core 移除） | 3（已转绿） |
| 3 | `\uXXXX` 转义标识符（**已实施**，4 位形） | 0（已转 PASS；`\u{…}` 仍缺） | `core/syntax/templates/symbol-template.xl.md`、`core/syntax/basic-tokens/{common,symbol}.xl.md`、`typescript/run/typescript-template.xl.md`、`typescript/tokens/names/identifier-shape.xl.md` | 是（用户已批准） | A | 2（已转绿） |
| 4 | U+FEFF/BOM 作 trivia | 1（token 已实施；`lex-bom.ts` fixture 待裁定） | `core/syntax/basic-tokens/bom.xl.md`、`core/syntax/templates/template.xl.md` | 是（用户已批准） | A（新 basic token） | 0（`lex-bom.ts` 仍红） |
| 5 | shebang `#!` 首行 trivia（**已实施**） | 0（已转 PASS） | `core/syntax/basic-tokens/shebang.xl.md`、`core/syntax/templates/template.xl.md` | 是（用户已批准） | A（新 basic token） | 2（已转绿） |
| 6 | `>>` / `>>>` 是否 token 层拆 | 0（历史 1 已绿） | token 拆：`typescript/run/typescript-template.xl.md:49` + 两侧重组；保持：`expression-builder.xl.md` 复用 `IsSplitClose` | 拆=A 要 core；保持=B 不要 | B（保持） | 0 |
| 7 | `async` 上下文关键字升级口径 | 0 | 无（口径记录） | 否 | 保持现状 | 0 |
| | **合计** | **1** | | | | **1**（场景 1/2/3/5 已转 PASS；场景 4 token 已实现、fixture 待裁定；`>>` 口径项已绿） |

**合计影响（场景 4/5 落地后）：剩余 basic-token 红 1 份**（`lex-bom.ts` 的 BOM 在 raw index 109，index-0 规则不覆盖；三条候选待用户裁定）；场景 1（`/`）、2（`$`）、3 的 4 位形（`\uXXXX`）、5（shebang 2）已转 PASS；`\u{…}` 花括号形仍缺单列。
若场景 4 按候选 (b)/(c) 放宽，`lex-bom.ts` 可转绿（届时 ok 1645→1646、crash 38→37）。

## 9. `typescript/cases/basic-token.ts` 候选活跃行

该文件现已含场景 1/2/3/5 的实施活跃行 + 3 条原有 `/` 边界对照；场景 4（BOM，corpus 的 case reader 会 trim 行首 U+FEFF，无法写成活跃行）与 `\u{…}` 仍只写注释（BOM 用直接 Parse 探针验证）。
上述场景实施后，可把对应注释改成活跃行（新增行逐条跑 `npm run ast:cases` 确认）：

| 场景 | 候选活跃行 |
| --- | --- |
| 1 `/`（**已加入 corpus**） | `while (a) /re/g;`、`if (a) /re/g;`、`for (;;) /re/g;`、`do { } while (a) /re/g;`、`try { } catch (e) { } /re/g;`、嵌套两条、守卫 4 条 |
| 2 `$`（**已加入 corpus**） | `const $x = 1;`、`const a$b = 2;`、`interface I$X { a: number }`、`$();`、`const o = { $x: 1 };` |
| 3 `\uXXXX`（**已加入 corpus**） | `const \u0061bc = 1;`、`const a\u0062c = 2;`、`function f\u0066() {}`、`class C\u0031 {}`、`interface I\u0041 { a: number }`、`const o = { \u0061: 1 };` |
| 4 BOM（token 已实施；corpus 只加 shebang 行） | index-0 BOM 在 corpus 里会被 readCases 的 trim 去掉、token-ast 也会剥文件头 BOM，**无法用活跃行覆盖**；用 `SourceFileRunner.Parse("\uFEFFconst a = 1;")` 直接探针验证（已过）。 |
| 5 shebang（**已加入 corpus**） | `#!/usr/bin/env node\nconst a = 1;`、`#!/usr/bin/env node\nlet a = 1`（行内 `\n` 转义） |
| 6 `>>` | `const d = <Array<number>>y;`（当前口径已可 PASS）；若拆 token 再加 `a >> b;`、`a >>> b;` |
| 7 async | `async` 换行 `function f() {}`（口径对照，当前已与 TS 一致） |

## 10. 一句话裁定（汇总，给用户）

**允许改 basic token 吗？范围是 `core/syntax/basic-tokens/`，还是也包含 `typescript/run/typescript-template.xl.md`
与 `text-document.xl.md` 这两处 token 配置？**
按本清单推荐：2/4/5 只动 `typescript/run` 与 `typescript/tokens`（**不需要 core**），1 用 core 现有接口
（**不需要 core**），6 保持现状（**不需要 core**），只有 3（`\uXXXX`）推荐动 `core/syntax/basic-tokens/`。
若用户裁定「一律不动 core」，则 3 退方案 B（`Ban(["\\"])` + Identifier 投影解码），代价是 `\` 的词法错误位置放宽。
