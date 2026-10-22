# cover6 core-string（D + G）：行续接认 LS/PS、带标签模板非法转义取原文

本文件记录本分支（`cover6-core-string` @ prep `99f286d8`）的读数、复现、core 改动、G 的口径选择、测试增量与遗留。
归属：`docs/cover5-FINAL.md` §5 的 basic-token 层 **D（字符串行续接）** 与 **G（带标签模板非法转义）**。

## 0. 结论

- **D**：`"a\<U+2028>b"` / `"a\<U+2029>b"`（引号串与模板串）的 cooked 由 `"a<LS>b"` 改为 `"ab"`，
  与 TS 6.0.3 `StringLiteral.text` / `NoSubstitutionTemplateLiteral.text` 一致。
- **G**：``tag`\8` ``（以及 `\9`、legacy octal `\1`–`\7`、`\00`、`\377`、`\08`…、以及模板头 / 模板尾里的同类转义）
  的 `text` 由 cooked（`8` / `\u0001` / `ÿ`…）改为**原文**（`\8` / `\1` / `\377`…），与 TS 带标签模板的 `text` 一致。
- 修前 / 修后探针：**23 条候选 23 红 → 0 红**（全部是 `字段 text` 差；TS `parseDiagnostics` 均为 0）。
- 全量门禁：`ast-json` **5732/5732**（基线 5709 + 本分支 23）、diff **0/0/0**；
  `token-ast` total **1706**（1704 + 2 个新夹具）、ok 1696、crash 0、diff 0、known-gap 0、ts-invalid 10（未变）；
  `real-dts` 226/226；`tsc` 0 error；`xl_check` 0 error（仅既有 3 个 E2004 孤儿产物 warning）。

## 1. 改写点（core 以 `StringTemplate` 开关/钩子实现，默认值 = 既有行为）

| # | 文件 | 行 | 改动 |
| --- | --- | --- | --- |
| 1 | `core/syntax/templates/string-template.xl.md` | :25 `LineTerminatorChars:Array<string> = ["\n", "\r"]` | 新增：行续接认哪些行终止符。默认只有 CR/LF = 既有行为 |
| 2 | 同上 | :32 `StrictTemplateEscapes:bool = false` | 新增：模板串（引号内内插串）的非法转义是否保留原文。默认关 = 既有行为 |
| 3 | `core/syntax/basic-tokens/string/translate.xl.md` | :120 `DecodeClear(lineTerminatorChars, strictTemplateEscapes, nextItem?)` | 行续接判据由写死的 `\n`/`\r` 改成查 `lineTerminatorChars`；新增严格模式分支（非法转义 → `"\\" + Temp`） |
| 4 | 同上 | :236 新 `static IsInvalidTemplateEscape(temp)` | 判定「数字开头且不是孤立 `0`」= 模板串非法转义；是否启用由上表的开关决定 |
| 5 | `core/syntax/basic-tokens/string/string.xl.md` | :212-224 / :338-345 | 两处转义结算把 `StringTemplate.LineTerminatorChars` / `StrictTemplateEscapes` 传给 `Translate`；`Accept` 返回 false 的路径把「不属于本次转义的字符」当 `nextItem` 传进去 |
| 6 | `typescript/run/typescript-template.xl.md` | :226 / :228 | ts 模板启用：`LineTerminatorChars = ["\n","\r","\u2028","\u2029"]`、`StrictTemplateEscapes = true` |

**core 没有写死 TS/ECMAScript 常量**：`Translate` 只收到参数（行终止符表、严格开关），
两个语言事实都在 ts 模板页里给；默认字段值等于改动前的行为，所以其它语言 / 其它调用方零影响
（全量 5709 条基线在改 core 之后仍全绿，见 §4）。

### 与 `translate.xl.md:202`（`\u{…}` 的 `hex.length > 6`）的交互

lead 提醒的**字符串路径位数上限统一**（`hex.length > 6`）在本次改动里**一个字都没动**（现 :202，改前 :185 附近）。
G 的判据只落在 `DecodeClear` 的**数字开头**分支与新增的 `IsInvalidTemplateEscape`；
`u` / `x` 分支（含那条 `hex.length > 6`）保持原样，只是外层 if/else 链的第一个分支变成「严格模式 + 非法转义」。
所以 `tag`\u{110000}`` / `tag`\uZZZZ`` 的行为也没变（本来就是「按 ts 恢复口径返回原文」），与 unicode 分支的遗留互不覆盖。

## 2. D：行续接（LineContinuation）复现与 TS 字段

ECMAScript 的 `LineContinuation :: \ LineTerminatorSequence`，`LineTerminatorSequence` 包含
`<LF>` / `<CR>` / `<LS>` / `<PS>` / `<CR><LF>`；cooked 里什么都不产出。改前 core 只认 `\r` / `\n` / `\r\n`。

| 输入（`·` 处是 U+2028/U+2029） | TS `text` | 改前本仓 `text` | 改后 |
| --- | --- | --- | --- |
| `const s = "a\·b";`（LS） | `"ab"` | `"a<LS>b"` | `"ab"` |
| `const s = "a\·b";`（PS） | `"ab"` | `"a<PS>b"` | `"ab"` |
| `const s = 'a\·b';`（LS） | `"ab"` | `"a<LS>b"` | `"ab"` |
| `const s = "a\·b\·c";`（LS+PS） | `"abc"` | `"a<LS>b<PS>c"` | `"abc"` |
| `const s = "\·";`（只有续接） | `""` | `"<LS>"` | `""` |
| ``const s = `a\·b`;``（无内插模板） | `"ab"` | `"a<LS>b"` | `"ab"` |
| ``const s = `\·`;``（模板只有续接） | `""` | `"<PS>"` | `""` |
| ``const s = `a\·${x}b`;``（TemplateHead） | `"a"` | `"a<LS>"` | `"a"` |

诊断口径：以上全部 TS `parseDiagnostics = 0`（含 `\r\n`、`\r` 的既有形本来就绿）。
区间 / 结构两侧本来就一致，**只有 `text` 字段差**，属 basic-token 的 cooked 口径问题。

> 落点：`Translate.DecodeClear` 里 `Temp.length === 1` 的「行续接」判断从 `ch === "\n" || ch === "\r"`
> 改成 `lineTerminatorChars.includes(ch)`；`\r\n` 两字那条老分支保持不变（CRLF 仍算一个）。

## 3. G：带标签模板里的非法转义

### 3.1 TS 的规则（读 `node_modules/typescript/lib/typescript.js` 的 `scanTemplateAndSetTokenValue` / `scanEscapeSequence` 实证）

- 模板串扫描时反斜杠交给 `scanEscapeSequence`；**非法转义**（`ContainsInvalidEscape`）分两类：
  - legacy octal / NonOctalDecimal：`\1`–`\7`、`\00`（`\0` 后跟十进制数字）、`\8` / `\9`；
  - 非法 `\u` / `\x`（`\uZZZZ`、`\x4Z`、`\u{110000}`、`\u{FFFFFFFF}`）。
- **带标签模板**（`shouldEmitInvalidEscapeError = false`）：非法转义**不 cooked**，`scanEscapeSequence` 直接返回
  `text.substring(start, pos)`（原文，含反斜杠）；合法转义照旧 cooked。于是 ``tag`a\n\8b` `` 的 `text` 是
  `"a" + LF + "\\8b"`（**合法 cooked、非法原文**混排）。
- **不带标签模板**（`shouldEmitInvalidEscapeError = true`）：同样的非法转义报诊断（`Escape sequence '\8' is not allowed` 等）
  并返回 cooked 值；这类输入 TS **有诊断**，不在本轮的尺子里。

### 3.2 修前 / 修后（23 条里的 G 部分，全部 `parseDiagnostics = 0`）

| 输入 | TS `text` | 改前本仓 | 改后 |
| --- | --- | --- | --- |
| ``tag`\8`;`` | `"\\8"` | `"8"` | `"\\8"` |
| ``tag`\9`;`` | `"\\9"` | `"9"` | `"\\9"` |
| ``tag`\1`;`` / ``tag`\7`;`` | `"\\1"` / `"\\7"` | `"\u0001"` / `"\u0007"` | 原文 |
| ``tag`\377`;`` | `"\\377"` | `"ÿ"` | `"\\377"` |
| ``tag`\08`;`` / ``tag`\09`;`` | `"\\08"` / `"\\09"` | `"\u0000" + "8"` / `"\u0000" + "9"` | 原文 |
| ``tag`\008`;`` / ``tag`\08x`;`` | `"\\008"` / `"\\08x"` | `"\u0000" + "08"` / `"\u0000" + "8x"` | 原文 |
| ``tag`\8a`;`` | `"\\8a"` | `"8a"` | `"\\8a"` |
| ``tag`a\n\8b`;`` | `"a\n\\8b"` | `"a\n8b"` | `"a\n\\8b"` |
| ``tag`a\8\nb`;`` | `"a\\8\nb"` | `"a8\nb"` | `"a\\8\nb"` |
| ``tag`a\8b${x}c\9d`;`` | Head `"a\\8b"` / Tail `"c\\9d"` | `"a8b"` / `"c9d"` | 原文 |
| ``tag`\8${x}\8`;`` | Head/Tail 都是 `"\\8"` | `"8"` | `"\\8"` |
| ``tag`\uZZZZ`;`` / ``tag`\x4Z`;`` / ``tag`\u{110000}`;`` | 原文 | 原文（既有行为） | 不变 |

### 3.3 G 的结构性限制与口径选择（已报 lead，按「超集」口径落地）

- **tokenizer 无法知道「这个模板串有没有标签」**：`String` 在扫描时只看到反引号与内容；`TaggedTemplateExpression`
  是形状层（`ExpressionBuilder.ParseTemplateCall`）才确定的。要按 ES 严格区分「带标签 = 原文 / 不带标签 = cooked」，
  得把「非法转义 → 原文」的投影推迟到形状层，并把每个非法转义在段内的位置一起带上去（token 需要携带
  `invalidEscapeRanges` 之类的结构），改动面会扩到 `String` / `ConstString` / `NoSubstitutionTemplateLiteralShape`
  / `TemplateHead/Middle/Tail` / `ExpressionBuilder` / `TypeBuilder` 六处。
- **本轮选择（低风险、已验证）**：token 层对**模板串**统一产出原文（`StringTemplate.StrictTemplateEscapes`），
  ts 模板打开；**不带标签模板**的同类输入 TS 有诊断，本来就不在尺子里，所以本仓与 TS 的差异只落在
  「TS 非法输入」上——这是批准的「超集」口径。
- **普通引号串不受影响**：`String.IsSupportInterpolation` 为 false 的分支把 `strictTemplateEscapes` 固定传 `false`，
  所以 `"a\8b"` 的 cooked 仍是 `"a8b"`（与改前一致；TS 对这些输入报诊断）。
  这也保证 `plainConfig` 改动只影响行续接（D），不影响非法转义。
- **`\08` 的 `nextItem` 细节**：`\0` 本身合法、`\08` 非法，而 `Append` 不会把 `8` 收进 `Temp`。
  所以 `String` 在 `Accept` 返回 `false` 的那条路径把当前字符作为 `nextItem` 交给 `DecodeClear`；
  严格模式下 `Temp === "0"` 且 `nextItem` 是十进制数字时只把 `\0` 保留原文、后面的数字照常成为字面字符，
  与 TS 的 `text`（`"\\08"`）逐字符一致。

## 4. 读数

| 项 | prep `99f286d8` | 本分支 |
| --- | --- | --- |
| `ast-json.mjs` 全量 | 5709 / 5709 cj-ok / 0 fail（47 构造） | **5732 / 5732 / 0** |
| `ast-json-diff.mjs` 全量 | 5709/5709；结构 0 / 位置 0 / 字段 0 | **5732/5732；0 / 0 / 0** |
| `basic-token` stem | 108 / 108 | **131 / 131** |
| `token-ast.mjs --quiet` | total 1704；ok 1694；crash 0；diff 0；known-gap 0；ts-invalid 10 | **total 1706；ok 1696；crash 0；diff 0；known-gap 0；ts-invalid 10** |
| `real-dts-ast.mjs` | 226 / 226 | **226 / 226** |
| `tsc -p tsconfig.json` | 0 error | 0 error |
| `xl_check`（改动的 4 个文件） | — | 0 error（仅既有 3 个 E2004 孤儿产物 warning） |

探针（`tmp/`，不进 git）：
- `tmp/verify-final.cjs` + `tmp/final-cases.json`：**23 条真红 → 0 红**；
- 同一脚本在「baseline 构建」上跑（`git checkout` 4 个 xl 文件 → 重建 → 跑 → 恢复）：
  23 条 **全部红**、且全部是 `字段 text` 差（`tmp/verify-final-baseline.txt` vs `tmp/verify-final-fixed.txt`）；
- `tmp/verify-dg.cjs`：更宽的 D/G 矩阵 38 条，基线 17 绿 / 21 红 → 修后 38 绿 / 0 红（含合法转义、无转义、
  带 `${}` 的对照，证明没有过度收紧）。

## 5. 测试增量

1. `typescript/cases/basic-token.ts` **append-only**（108 → 131，+23）：
   末尾唯一标记段 `// ══ cover6 core（D/G 字符串）…`，D 9 条（双/单引号串、模板串、无内插/有内插、LS/PS、
   一处串两次续接、只有续接）+ G 14 条（`\8` `\9` `\08` `\09` `\1` `\7` `\377` `\008` `\08x` `\8a`、
   `\n` 与 `\8` 混排两个方向、TemplateHead/TemplateTail、头尾各一个）。
   LS/PS 用**行内字面字符**（WORKFLOW §3.1；行首行尾会被 `trim()` 吃掉，所以都在行内）；
   快照 `basic-token.{cj,ts}-ast.json` 已重新生成并随分支提交。
2. `tests/cases/token/lexical/lex-string-line-continuation-ls.ts`（新增，D）：
   `"ab\<LS>cd"` / `'p\<PS>q'` / `` `x\<LS>y` `` / `"e\<PS>f\<LS>g"` 四条，带 `// xl:note` / `// xl:expect`。
3. `tests/cases/token/lexical/lex-template-invalid-escape.ts`（新增，G）：
   ``tag`\8` `` / ``tag`a\n\8b` `` / ``tag`\1\7` `` / ``tag`\377` `` / ``tag`\08x` `` / ``tag`a${x}b\9` ``，
   带 `// xl:note` / `// xl:expect`。
4. `token-ast` 因此从 1704 → **1706**（两个夹具都 ok、非 ts-invalid）：这条说明新夹具在「真实多行语料」尺子上也一致。

## 6. 遗留 / 需要裁定

1. **不带标签模板的非法转义**：本仓现在也产出原文（TS 有诊断、返回 cooked）。按批准的超集口径接受；
   若以后要严格区分，落点见 §3.3（token 携带非法转义区间 + 形状层投影）。目前**不建用例、不入尺子**。
2. **字符串路径 `\u{…}` 的位数上限统一**（`translate.xl.md:202` 的 `hex.length > 6`）：**未动**，属 cover6-core-unicode
   那一批的遗留，与本分支无交互（§1 末）。
3. **`\` + CR + LS / `\` + LS 后跟裸 LS**：ECMAScript 里 CR 单独就是 LineTerminatorSequence，
   `\`+CR+LS 是「续接 + 一个裸 LS」——引号串里裸 LS 非法、模板串里是普通字符。本分支没为这种
   混合形态建用例（TS 侧引号串有诊断；模板串的形态本仓已按「续接 + 字面 LS」处理，与 TS 一致）。
4. **C# 那一族（逐字串 / 原始串 / 前缀内插）**：`StringTemplate` 两个新字段默认值 = 既有行为，
   那些路径不经过 `StrictTemplateEscapes`（只有 `IsSupportInterpolation` 分支传 true），无需回归。
5. **`tests/gates/run.mjs` 在本克隆上 7/8 失败**（`tests/parse/ts-shape.mjs` 的 `MODULE_NOT_FOUND` / 无输出），
   与本分支改动无关；本轮任务门禁口径不含它，未修。合并后的 HEAD 上 `cases:check`
   （`tests/parse/validate.mjs`）曾出现 1717 条用例 / **3 条不合格**——**不是**环境 / 基线问题
   （基线 `99f286d8` 实测 1708 条 / 0 不合格），差异来自 cover6-E / F 新增的 3 个夹具头元数据
   （覆盖层的头缺 `// xl:end`、`xl:expect` 里写了幽灵标签或 TS kind 名）；已由 `cover6-fix-fixture-meta` 分支修正。
6. **`basic-token.ts` 的 `-text` 属性**：prep 提交已把该文件钉成 `-text`，本分支追加的行含字面 LS/PS（无 CR），
   提交后 `git cat-file -s` 与工作树字节数一致（见 §5 的字节自检），无需再改 `.gitattributes`。

## 7. 附：cover6 夹具头元数据修复（`cover6-fix-fixture-meta`，独立分支）

终验发现合并后的 HEAD 上 `node tests/parse/validate.mjs` = 1717 条用例 / **3 条不合格**（prep `99f286d8` 是 1708 / 0）。
3 条都是新增夹具的文件头元数据问题（与本分支字符串改动无关），由独立分支 `cover6-fix-fixture-meta` 修正：

| 夹具 | 原问题（`cases:check` 的具体报错） | 修正 |
|---|---|---|
| `lex-optional-chain-digit-lookahead.ts` | ① 头里有覆盖层键 `xl:round` 却没有 `// xl:end`（`case-file.mjs`：覆盖层文件头必须以 `xl:end` 收尾）；② `xl:expect` 里 `ConditionalExpression` 不在标签表，`QuestionToken` / `NumericLiteral` / `ColonToken` / `PropertyAccessExpression` / `QuestionDotToken` 是幽灵标签（投影层 kind，永远不进产物） | expect 改 `Let,TernaryOperator,PropertyAccess`（语料先例：`ex-ternary.ts` / `am-call-type-args.ts`）；幽灵标签移入 `xl:absent`；补 `// xl:end` |
| `lx-optional-chain-digit.ts` | 同上（缺 `xl:end`；`ConditionalExpression` 未知、`NumericLiteral` / `QuestionDotToken` 幽灵） | 同上 |
| `lex-unicode-escape-brace-long.ts` | `xl:expect` 里 `VariableStatement` / `VariableDeclarationList` / `VariableDeclaration` / `NumericLiteral` / `TypeReference` 是幽灵标签；`FirstStatement` / `FunctionDeclaration` / `ClassDeclaration` / `PropertyDeclaration` 不在标签表（后两者是 TS kind 名） | expect 改 `Let,Function,Class,ObjectLiteral,MethodDeclaration`（类方法与对象的先例见 `am-class-modifier-order.ts` / `am-prop-named-keywords.ts`）；幽灵标签移入 `xl:absent`；未知标签删除 |

**依据**：`tests/parse/validate.mjs` 的 `TAGS` / `GHOST_TAGS` 是唯一标签表（幽灵标签只能写进 `xl:absent`）。
历史上做标签级判据的 `tests/parse/tags.mjs` 在「第 1017 轮」已删除，它当年的产品 XML 取法
（`TextContext` / `typescript/text-document.js`）在本仓重构后也已不存在，所以 `xl:expect` 现在只被 `cases:check`
当**标签合法性**校验、不再逐条核产物；这里按「语料里同类形态已用过的产品标签」取值，与用例的 `xl:note` 语义一致。
**token-ast 不受影响**：3 个夹具改头前后都 OK（头只是注释 trivia，AST 对拍不看 `xl:expect`）。
修正后 `cases:check` = **1717 条用例 / 0 条不合格**；`token-ast` = 1713（ok 1703 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0）、
`ast-json` 5784/5784、`ast-json-diff` 0/0/0、`real-dts` 226/226、`tsc` 0。
