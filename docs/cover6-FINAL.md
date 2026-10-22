# cover6 FINAL — core 轮终验报告（独立复核）

> 终验者：end-build 作者（独立于 4 位 core 作者与合并成员 infra）。
> 复核对象：主仓 `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/quick-parse` @ **`ff2ea1e8`**。
> 方法：结构/审计用主仓 `git` 只读复核；端到端与门禁在**独立验证克隆**
> `C:\Users\Admin\Documents\GitHub\xl-example-set\cover6-final-verify` 上从 `.xl.md` 重新构建
> （`xl_build` 863 written / 0 error → `tsc` 0）后实测；探针与日志只在该克隆 `tmp/`（不进 git）。
> 本文档是本次终验**唯一新增/提交**的文件（`docs(cover6): final report`），未改任何代码/用例/其它文档。

## 1. 结论

**PASS** —— 用户批准的 7 项（A–G）、core 审计、用例标准、token 语料、全量门禁（ast-json / diff /
real-dts / tsc / xl_check）全部实测通过，且与 infra 报数一致。

附 **1 条非阻塞异常**（要求如实列出，本轮权限不允许修）：`cases:check`
（`tests/parse/validate.mjs`）由基线 **1708 用例 / 0 不合格** 变为 **1717 用例 / 3 不合格**，
3 条全部是**本轮新增夹具**的头部元数据不合规（E×2、F×1），不是 AST/产品回归。
若 Lead 把 `cases:check` 列为 blocking 门禁，则本报告应改为 **CONDITIONAL（待修 3 个夹具头）**；
其余全部读数不受影响。详见 §7.1。

> **更新（2026-10-22，第 5 条合并 `1b8e2060` 之后复核）**：§7.1 的异常已由独立分支
> `cover6-fix-fixture-meta`（`4d659ea9`，merge `1b8e2060`）修复并复核闭环——
> `node tests/parse/validate.mjs` = **1717 用例 / 0 不合格（exit 0）**，token-ast / ast-json / diff 读数不变。
> **最终结论 = PASS（无阻塞项）**，不再需要 CONDITIONAL；复核细节与新读数见 **§9 附录**。

| 项 | 结果 |
| --- | --- |
| HEAD / 合并链 / 范围 | ✅ `ff2ea1e8`，4 条 merge（`221b24ee`/`59c469cc`/`108b1767`/`ff2ea1e8`），28 文件 +8059/−29 |
| core 审计 | ✅ 只 9 个批准文件；默认值全部保持历史行为；core 无可执行的 TS/ECMAScript 专用常量；IMPORTANCE 未动；无新增依赖 |
| A/B/C 行终止符 | ✅ 修前 12 红（文档）→ 实测全绿 |
| D 字符串行续接 | ✅ 修前 23 红（text 字段，文档）→ 实测全绿 |
| E `?.` 前瞻 | ✅ 修前 `a?.5:b` crash（文档）→ 实测全绿，4 条可选链回归全绿 |
| F `\u{…}` 位数 | ✅ 修前 12+16 条合法形 crash（文档）→ 实测全绿；TS 非法 19 条行为记录 |
| G 模板非法转义 | ✅ 修前 text 差（文档）→ 实测全绿 |
| 用例标准（basic-token） | ✅ 4 段标记、11+26+15+23=75（108→183）；单 stem **183/183**、diff **0/0/0**；抽样 12 条全绿 |
| token 语料 | ✅ 9 个新夹具（+65 行）；token-ast **1713（ok 1703 / crash 0 / diff 0 / known-gap 0 / ts-invalid 10）**；2 个含 CR 夹具 `i/-text`；字节数逐一核对 |
| 全量门禁 | ✅ ast-json **5784/5784**、diff **0/0/0**、real-dts **226/226**、`tsc -p` 与 `--noEmit` **0**、xl_check **0 error** |
| `cases:check`（附加） | ⚠️ 回归：1708/0 → 1717/3 不合格（新夹具头元数据，非 AST；见 §7.1） |

## 2. 结构与范围（逐条实测）

```text
HEAD                      ff2ea1e89d34bf6ead6c82cd8c1a191460c9235f
git status --porcelain    （空）
git log --merges --oneline 99f286d8..HEAD
  ff2ea1e8 merge: cover6-core-string
  108b1767 merge: cover6-core-symbol
  59c469cc merge: cover6-core-unicode
  221b24ee merge: cover6-core-lineterm
git diff 99f286d8..HEAD -- typescript/IMPORTANCE.md   → 0 行
git ls-files | grep '^tmp/'                            → 空
git diff 99f286d8..HEAD --stat                         → 28 files changed, 8059 insertions(+), 29 deletions(-)
```

范围拆解（28 文件）：core **9** + docs/cover6-core-* **4** + `tests/cases/token/lexical/*` 新夹具 **9**
+ `typescript/cases/basic-token.ts`（+119 行，case 108→183）+ 两份派生快照 + ts 层 3 文件
（`typescript/run/typescript-template.xl.md`、`typescript/run/typescript-symbol-template.xl.md`、
`typescript/tokens/names/identifier-shape.xl.md`）。范围与用户批准的 7 项一一对应，没有越界文件。

回滚点：`99f286d8`（prep，cover5 终点 `db7d13c3` 之后；`git merge-base --is-ancestor db7d13c3 99f286d8` = True）。

## 3. 7 项 A–G：修前红证据 → 修后实测

修前红证据来自对应分支文档（文档内均为实测探针读数）；**修后一律为本轮独立克隆上重新构建后的实测**
（探针 `tmp/probe-cover6.mjs`，TS 6.0.3，口径 = `typescript/cases/ast-compare.mjs` 三栏，
TS `parseDiagnostics=0`）：

| 项 | 修前红（证据来源） | 修后实测（本轮） | core 改动（file:line） | 开关/钩子 ＋ 默认值 | ts 模板启用 | 新增用例/夹具 |
| --- | --- | --- | --- | --- | --- | --- |
| **A/B/C** 行终止符 | `// c\rconst a=1;`、`// c<LS>…`、`// c<PS>…`：树为空（整行吞到 EOF）；`#!x\r…` 同。`docs/cover6-core-lineterm.md` §2 表（探针 26 条：修前 14 绿/12 红 → 修后 26/0） | 4 条全绿（`A-default`/`A-ls`/`A-ps`/`C-shebang-cr`，diag=0，结构/位置/字段 0/0/0） | `core/syntax/templates/template.xl.md:74-88`（字段 + `IsLineTerminator`）；`core/syntax/basic-tokens/line-annotation.xl.md:129-158`；`core/syntax/basic-tokens/shebang.xl.md:69-77` | `Template.LineTerminatorChars`，**默认 `"\n"`**（= 两 token 的历史判据）；`IsLineTerminator` 只查表 | `typescript/run/typescript-template.xl.md:226` → `"\n\r\u2028\u2029"` | `basic-token.ts` 段① 11 条；夹具 `lex-line-comment-{lone-cr,ls,ps}.ts`、`lx-shebang-cr.ts` |
| **D** 字符串行续接 | `"a\<LS>b"` / `` `a\<LS>b` `` 的 cooked text 差（23 条候选 23 红，全部 `字段 text`；D/G 矩阵 17 绿/21 红）。`docs/cover6-core-string.md` §1/§3.2 | 4 条全绿（引号串/模板串 × LS/PS） | `core/syntax/templates/string-template.xl.md:25`（字段）；`core/syntax/basic-tokens/string/translate.xl.md:120`（`DecodeClear` 参数化）；`core/syntax/basic-tokens/string/string.xl.md:212-224`、`:338-345`（从模板取表传参） | `StringTemplate.LineTerminatorChars`，**默认 `["\n","\r"]`**（= 旧 `ch === "\n" \|\| ch === "\r"`） | `typescript-template.xl.md:232` → 加 LS/PS | `basic-token.ts` 段④ D 部分 9 条（s1–s9）；夹具 `lex-string-line-continuation-ls.ts` |
| **E** `?.` 前瞻 | `const x = a?.5:b;` / `a?.5:b;` / `f(a?.5:b);` 修前 crash「表达式没有读完」「表达式语句没有读完」「不支持的表达式起点」。`docs/cover6-core-symbol.md` §2 表 + §3 | 全绿：`a?.5:b`、`a?.5e3:b` + 回归 `a?.b`/`a?.[x]`/`a?.(x)`/`a?.<T>(x)`（diag=0，三栏一致） | `core/syntax/templates/symbol-template.xl.md:160`（新钩子）；`core/syntax/basic-tokens/symbol.xl.md:69`（`IsAppend` 问钩子）、`:72`（`NextCharAfter`） | `SymbolTemplate.IsCombineBlocked(combined, following)`，**默认 `return false`**（= 历史组合表行为） | `typescript/run/typescript-symbol-template.xl.md:69-85` 覆写「`?.` 且 following 是 0-9 → 不合并」 | `basic-token.ts` 段③ 15 条；夹具 `lex-optional-chain-digit-lookahead.ts`、`lx-optional-chain-digit.ts` |
| **F** `\u{…}` 位数 | `const \u{0000061} = 1;` 等 12+16 条 TS 合法形 crash（「变量声明缺少标识符」等）。`docs/cover6-core-unicode.md` §2 | 全绿：`\u{0000061}`（9 位前导零）、`\u{000000061}`、`\u{0001D400}`（星面）；`\u{110000}`/`\u{}` 记录行为（TS invalid，不入尺子） | `core/syntax/basic-tokens/common.xl.md:71`（`MaxUnicodeCodePoint` = 0x10FFFF）、`:81`（`IsUnicodeEscapeStart` 去 6 位上限）、`:167`（`UnicodeBraceEscapeValue`）、`:65`/`:117`/`:193`（越界即非法） | 既有开关 `SymbolTemplate.SupportUnicodeEscapeIdentifier`（`symbol-template.xl.md:49` **默认 false**，关闭时零影响）；位数不限、码点 ≤ 0x10FFFF（Unicode 定义，非 ECMAScript 常量） | ts 早在此前轮已开 `SupportUnicodeEscapeIdentifier`；`typescript/tokens/names/identifier-shape.xl.md:63` 解码上限改取 `Common.MaxUnicodeCodePoint`（正则 `{1,6}`→`+`） | `basic-token.ts` 段② 26 条；夹具 `lex-unicode-escape-brace-long.ts` |
| **G** 模板非法转义 | `` tag`\8` `` / `` tag`\09` `` / `` tag`\08x` `` 修前 text 取 cooked（不是原文）。`docs/cover6-core-string.md` §1/§3.2 G 部分 | 全绿：3 条 text 均取原文（diag=0，三栏一致）；无标签 `` `\8` `` TS diag=1（记录：TS text `"8"` vs 本仓 `"\8"`，尺子不测） | `core/syntax/templates/string-template.xl.md:32`（字段）；`core/syntax/basic-tokens/string/translate.xl.md:236`（`IsInvalidTemplateEscape`）、`:147`（应用）；`string.xl.md:212-224` 传入开关 | `StringTemplate.StrictTemplateEscapes`，**默认 `false`**（= 历史按八进制/字符解码；普通引号串恒 false） | `typescript-template.xl.md:234` → `true` | `basic-token.ts` 段④ G 部分 14 条；夹具 `lex-template-invalid-escape.ts` |

（E 项回归对照 4 条、A/B/C 的 4 条、D 的 4 条、F 的 3 条、G 的 3 条，共 32 条 TS 合法输入全部
`diag=0` 且三栏 `0/0/0`；探针汇总 `FAIL 0`。）

## 4. core 审计（9 文件，逐 hunk 复核）

`git diff 99f286d8..HEAD --name-only -- core` = **恰好 9 个批准文件**（无越界）：

| 文件 | +/− | 内容 |
| --- | --- | --- |
| `core/syntax/templates/template.xl.md` | +17 | A/B/C：`LineTerminatorChars`（默认 `"\n"`）+ `IsLineTerminator` |
| `core/syntax/basic-tokens/line-annotation.xl.md` | +16/−2 | A：`ExitOrPre` 改问 `IsLineTerminator`；lone CR 自己的收尾分支 |
| `core/syntax/basic-tokens/shebang.xl.md` | +4/−3 | C：同款改问 `IsLineTerminator` |
| `core/syntax/templates/string-template.xl.md` | +17 | D/G：`LineTerminatorChars`（默认 `["\n","\r"]`）+ `StrictTemplateEscapes`（默认 false） |
| `core/syntax/basic-tokens/string/translate.xl.md` | +53/−5 | D/G：`DecodeClear` 参数化 + `IsInvalidTemplateEscape` |
| `core/syntax/basic-tokens/string/string.xl.md` | +14/−5 | D/G：从模板取表/开关传参 |
| `core/syntax/templates/symbol-template.xl.md` | +13 | E：`IsCombineBlocked` 前瞻钩子（默认 false） |
| `core/syntax/basic-tokens/symbol.xl.md` | +31/−3 | E：`IsAppend` 问钩子 + `NextCharAfter` |
| `core/syntax/basic-tokens/common.xl.md` | +60/−7 | F：去 6 位上限、`MaxUnicodeCodePoint`、`UnicodeBraceEscapeValue` |

**① 默认值 = 历史行为（逐项证据）**

- `Template.LineTerminatorChars = "\n"`（`template.xl.md:74`）：旧 `LineAnnotation`/`Shebang` 的判据就是
  `source.Value !== "\n"` → Undo。默认下新钩子只认 `\n`，且 lone-CR 分支（`source.Value === "\r"`）
  在默认表下不可达 → **行为逐字不变**。
- `StringTemplate.LineTerminatorChars = ["\n","\r"]`（`string-template.xl.md:25`）：旧的 `DecodeClear`
  判据就是 `ch === "\n" || ch === "\r"` → 默认等价。
- `StringTemplate.StrictTemplateEscapes = false`（`:32`）：`DecodeClear` 新增的严格分支以它为守卫，
  默认 false 时第一分支永不进入；`nextItem` 也只在严格口径使用 → **普通串/模板串解码路径不变**。
- `SymbolTemplate.IsCombineBlocked` 默认 `return false`（`symbol-template.xl.md:160`）：`IsAppend` 的
  返回值 `!false` 与旧式「组合表成立即可」等价；`NextCharAfter` 是纯查询、无副作用。
- F：`SymbolTemplate.SupportUnicodeEscapeIdentifier` **默认 false**（`symbol-template.xl.md:49`）；
  关闭时 `IsUnicodeEscapeStart` 恒 false（`common.xl.md:91`），`\u{…}` 走旧符号路径。上限是
  **Unicode 标量最大值** `0x10FFFF`（Unicode 定义，不是 ECMAScript 专用常量）。

**② core 没有 TS/ECMAScript 专用可执行常量（`git grep` 证据）**

- `git grep -n '2028' -- core` 命中 **4 行、全部是注释/文档文字**（`line-annotation.xl.md:121`、
  `shebang.xl.md:64`、`string-template.xl.md:29`、`template.xl.md:79`，均为「ts 模板配置为 …」的说明），
  **不是代码常量、不是默认值**。可执行常量只在 typescript/：
  `typescript/run/typescript-template.xl.md:226`（`"\n\r\u2028\u2029"`）、`:232`（`["\n","\r","\u2028","\u2029"]`）、
  `:234`（`StrictTemplateEscapes = true`）、`typescript/run/typescript-symbol-template.xl.md:69-85`（`?.` 前瞻）。
- `?.`：core 的 `case "?.":`（`symbol-template.xl.md:150`）在 **prep `99f286d8` 就已存在**
  （`git show 99f286d8:core/syntax/templates/symbol-template.xl.md` 核对），是语言无关的组合符号表条目，
  本轮未改；core 只新增默认 false 的钩子，ECMAScript 的 `?.` 规则只在 ts 模板。
- 文本里的 `?.` 命中均为实现代码自身的 TS 可选链语法（如 `context?.Messages`）或注释，不属于词法常量。

**③ 其它**：`git diff 99f286d8..HEAD -- typescript/IMPORTANCE.md` = 0 行；core diff 中无
`# dependencies` / `import` 变化（未新增依赖）；core 的改动全部是「模板开关/钩子 + 参数化」，
语言事实（LS/PS、`?.`、严格转义）只在 `typescript/run/*template*` 启用。

## 5. 用例标准（`typescript/cases/basic-token.ts`）

- **4 个 `cover6 core` 标记段**：A/B/C 行 201、F 行 223、E 行 261、D/G 行 287（HEAD 实测行号）。
- 段内 active 用例：**11 + 26 + 15 + 23 = 75**；文件 active 用例 **108 → 183**（+75，与 infra 报数一致）。
- 单 stem：`ast-json.mjs basic-token` = **183/183 cj-ok**；`ast-json-diff.mjs basic-token` =
  **183/183 完全一致；结构 0 / 位置 0 / 字段 0；没有 gap**。
- **独立抽样 12 条**（每段 3 条，不在用例里预置结果，用本轮探针按 `decodeCaseText` 还原后现场对拍
  TS 6.0.3）：行 207/209/211（lineterm）、237/239/257（unicode）、270/284/286（symbol）、
  292/297/314（string/DG）→ **12/12 `diag=0` 且三栏 0/0/0**。

## 6. token 语料（9 个新夹具）

```text
git diff 99f286d8..HEAD --stat -- tests/cases/token
  lex-line-comment-lone-cr.ts          +3
  lex-line-comment-ls.ts               +3
  lex-line-comment-ps.ts               +3
  lex-optional-chain-digit-lookahead.ts +6
  lex-string-line-continuation-ls.ts   +7
  lex-template-invalid-escape.ts       +9
  lex-unicode-escape-brace-long.ts     +22
  lx-optional-chain-digit.ts           +11
  lx-shebang-cr.ts                     +1
  9 files changed, 65 insertions(+)
```

- `git ls-files --eol`：含 lone CR 的 2 个夹具 = **`i/-text w/-text attr/-text`**
  （`lex-line-comment-lone-cr.ts`、`lx-shebang-cr.ts`；prep 里已 `chore(cover6): pin -text for CR-bearing
  case fixtures` 把 CR 夹具钉成二进制口径）；其余 7 个 = `i/lf w/lf attr/text=auto eol=lf`。
- 字节抽查（`git cat-file -s HEAD:<path>` vs 工作区大小）：5 个全等（105/105、119/119、124/124、
  17/17、969/969、356/356）。
- `token-ast --quiet`（本轮克隆实测）：**total=1713 ok=1703 crash=0 diff=0 ts-invalid=10 known-gap=0**
  → 与 cover5 终点 1704（ok 1694 / ts-invalid 10）相比 +9 夹具、ok +9，无 crash/diff、无 known-gap。

## 7. 全量门禁（本轮独立克隆重新构建后实测）

构建：`xl_build(paths=["core","typescript"], targets=["ts"], out="dist")` → **863 written / 0 error**
（2461 warning 为既有 W3102/W3103 噪音）；`tsc -p tsconfig.json` → 0；`tsc -p tsconfig.json --noEmit` → 0；
构建后 `git status` 除 `tmp/` 外干净（派生快照重写后与 HEAD 一致）。

| 门禁 | 读数 |
| --- | --- |
| `ast-json.mjs`（47 构造） | **5784 / cj-ok 5784 / cj-fail 0** |
| `ast-json-diff.mjs` | **5784/5784 完全一致；结构差 0、位置差 0、字段差 0** |
| `basic-token` 单 stem | **183/183**；diff 0/0/0 |
| `token-ast.mjs --quiet` | total **1713**，ok **1703**，crash **0**，diff **0**，known-gap **0**，ts-invalid **10** |
| `real-dts-ast.mjs` | 文件 **226**：解析成功 **226**、崩溃 **0**、AST 完全一致 **226**、差异 **0** |
| `tsc -p` / `--noEmit` | 0 / 0 |
| `xl_check`（main 仓，paths core+typescript） | **863 file(s), 0 error(s), 2464 warning(s)**；warning = 既有 W3102/W3103 + **3 条既有 E2004**（`dist/ts/core/syntax/{add-result,branch-condition-result,branch}.ts` 孤儿产物），与基线同族、可接受 |
| 版本 | TypeScript **6.0.3**；Node v24.21.0 |

基线对照（`docs/cover5-FINAL.md` 记录）：cover5 终点 `db7d13c3` 为
**5709/5709**、diff 0/0/0、basic-token 108、token-ast 1704（1694/10）、real-dts 226/226；
本轮 **5784/5784（+75 全部来自 basic-token 新增用例）**、basic-token **183**、token-ast **1713**、dts/tsc 不变。

### 7.1 异常：`cases:check` 回归（新夹具头元数据，非 AST/产品回归）

```text
# prep 99f286d8（worktree + 链接 node_modules 实测）：
node tests/parse/validate.mjs   → exit 0：1708 条用例，0 条不合格
# HEAD ff2ea1e8（验证克隆实测）：
node tests/parse/validate.mjs   → exit 1：1717 条用例，3 条不合格
```

3 条 BAD 全部是本轮新增夹具：

| 夹具 | 报错 |
| --- | --- |
| `token/lexical/lex-optional-chain-digit-lookahead` | 文件头缺 `// xl:end`；`xl:expect` 用了产品侧不存在的/幽灵标签（ConditionalExpression、QuestionToken、NumericLiteral、ColonToken、PropertyAccessExpression、QuestionDotToken） |
| `token/lexical/lx-optional-chain-digit` | 同款：缺 `// xl:end` + 幽灵/未知标签 |
| `token/lexical/lex-unicode-escape-brace-long` | `xl:expect` 用了幽灵标签（VariableStatement/VariableDeclarationList/VariableDeclaration/NumericLiteral/TypeReference）与未登记标签（FirstStatement/FunctionDeclaration/ClassDeclaration 等） |

判定：这是**夹具头部元数据不合规**（`xl:expect` 应写产物标签、GHOST_TAGS 只能进 `xl:absent`、
覆盖层文件头以 `// xl:end` 收尾），不是 AST 读数回归——token-ast/ast-json/real-dts 全绿，
且这 3 个夹具在 token-ast 里正常参与并 ok。`docs/cover6-core-string.md:155` 把 `cases:check`
记成「环境 / 基线问题、与本分支无关」，本轮实测**不成立**：基线 0 不合格、HEAD 3 不合格，差异就是
E/F 新增夹具头。它不在 Lead 列出的本轮门禁口径里，且本轮权限只允许新增本文档，故**未修**；
建议作为下一轮必修项（3 个文件头各补 `// xl:end`，`xl:expect` 改成产品标签或移入 `xl:absent`）。

## 8. 遗留 / 需裁定（均未在本轮修改）

1. **字符串字面量 `\u{…}` 的位数上限统一**：`core/syntax/basic-tokens/string/translate.xl.md:202`
   仍写死 `hex.length > 6`（越界只按 `> 0x10FFFF` 返回原文）。本轮只统一了**标识符**路径
   （`common.xl.md` + `identifier-shape.xl.md`），字符串路径未动——与 `docs/cover6-core-unicode.md` §7、
   `docs/cover6-core-string.md` §6 记录一致。
2. **G 的严格化落点**：tokenizer 不知道 tagged，当前统一产出原文（超集口径）。无标签 `` `\8` ``
   TS 是语法错误（diag=1），TS 侧 text 为 `"8"`、本仓为 `"\8"`——不建用例、不入尺子；
   要严格区分需 token 携带非法转义区间 + 形状层投影（`ExpressionBuilder.ParseTemplateCall`）。
3. **F 的 TS 非法边界**：`\u{110000}`（diag=3）/ `\u{}`（diag=2）本仓 crash（「变量声明缺少标识符」），
   TS 自身非法、尺子不测；`\u{10FFFF}`/`\u{FFFF}`/`\u{D7FF}`/`\u{0000}` 本仓接受为转义标识符
   （与修前一致：只校验 ≤ 0x10FFFF）。
4. **ID_Start / ID_Continue 不校验**：本仓只校验码点上限，不校验解出的 code point 是否合法标识符字符
   （既有边界，`docs/cover6-core-unicode.md` §7）。
5. **U+2028/29 的 ASI 属 end 类遗留**：本轮 core 只让 LS/PS 成为行终止符/trivia；ASI 换行判据
   （`expression-statement-possible-shape.xl.md` 的 `HasLineBreak`、`statement-builder.xl.md` 的
   `HasLineBreakAfter` 等，只认 `\n`/`\r`）本轮未改、也不在批准范围 → 归 end-compute 下一轮。
6. **`tests/gates` 环境性失败**：本轮门禁口径不含 `npm run gates`（其含 runtime/coverage 等环境敏感门），
   未纳入 PASS/FAIL 判定；`cases:check` 单独跑出 §7.1 的新夹具问题，已如实上报。

## 9. 合并记录与回滚点链

```text
db7d13c3  docs(cover5): final report            ← cover5 终点（5709/5709）
   │
99f286d8  chore(cover6): pin -text for CR-bearing case fixtures   ← 本轮 prep / 轮次基线
   ├─ 221b24ee  merge: cover6-core-lineterm   (99f286d8 + 0d82b8bf)
   ├─ 59c469cc  merge: cover6-core-unicode    (221b24ee + bd774167)
   ├─ 108b1767  merge: cover6-core-symbol     (59c469cc + 99db2cad)
   └─ ff2ea1e8  merge: cover6-core-string     (108b1767 + 3922266c)   ← 本轮 HEAD
```

回滚方式：
- **整体回滚**：`git reset --hard 99f286d8`（或 revert 之后追加的 4 个 merge），回到 cover5 终点状态。
- **单分支回滚**：`git revert -m 1 <merge-sha>`（如 `221b24ee`/`59c469cc`/`108b1767`/`ff2ea1e8`），
  只撤那一项 core 改动；四个分支的 write scope 互不重叠（A/B/C、D/G、E、F 各自文件）。
- **本文档提交**：位于 `ff2ea1e8` 之后的独立 `docs(cover6): final report` commit，只新增
  `docs/cover6-FINAL.md`；`git revert <本提交>` 即撤掉终验报告，不动任何代码。
- 分支 tips（合并成员可核对）：`cover6-core-lineterm @ 0d82b8bf`、`cover6-core-unicode @ bd774167`、
  `cover6-core-symbol @ 99db2cad`、`cover6-core-string @ 3922266c`。

---

**终验复跑方式（任意克隆，勿在主仓写）**

```powershell
# 结构/审计（主仓只读）
git rev-parse HEAD; git log --merges --oneline 99f286d8..HEAD
git diff 99f286d8..HEAD --stat; git diff 99f286d8..HEAD -- typescript/IMPORTANCE.md
git grep -n '2028' -- core

# 端到端/门禁（独立克隆，从 .xl.md 重建）
xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
node typescript/cases/ast-json.mjs && node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet && node typescript/cases/real-dts-ast.mjs
```

## 9. 附录：`cases:check` 回归已修复（commit `4d659ea9` + merge `1b8e2060`）

### 9.1 异常原文与根因（历史记录，保留可追溯）

- 终验时（HEAD `ff2ea1e8`）：`node tests/parse/validate.mjs` = **1717 用例 / 3 条不合格 / exit 1**；
  基线 prep `99f286d8` = **1708 / 0 / exit 0**（同一 worktree 实测）。
- 3 条 BAD 全为 cover6 新增夹具的**文件头元数据**（产品代码未变）：
  - `tests/cases/token/lexical/lex-optional-chain-digit-lookahead.ts`、
    `tests/cases/token/lexical/lx-optional-chain-digit.ts`：覆盖层文件头缺 `// xl:end`（`xl:round` 存在时必需，
    规则在 `tests/cases/case-file.mjs` 一侧），且 `xl:expect` 写了 TS kind 名/幽灵标签
    （`ConditionalExpression` 不在标签表；`QuestionToken`/`NumericLiteral`/`ColonToken`/
    `PropertyAccessExpression`/`QuestionDotToken` 属 `GHOST_TAGS`，只能进 `xl:absent`）。
  - `tests/cases/token/lexical/lex-unicode-escape-brace-long.ts`：`xl:expect` 用了幽灵标签
    （`VariableStatement`/`VariableDeclarationList`/`VariableDeclaration`/`NumericLiteral`/`TypeReference`）
    与未登记标签（`FirstStatement` 等；`FunctionDeclaration`/`ClassDeclaration` 等是 TS kind 名）。
- 根因是**夹具头元数据不合规**，不是 AST/产品回归（token-ast / ast-json / real-dts 当时即全绿）。
  `docs/cover6-core-string.md` 原先把 `cases:check` 记成「环境 / 基线问题」，实测不成立，已在该文档 §7 一并更正。

### 9.2 修复（独立分支，未改产品代码）

- 分支 `cover6-fix-fixture-meta` @ **`4d659ea9`** `cover6(fixtures): 修正 3 个夹具头元数据（cases:check 回归清零）`
  （由 basic-token 执行；write scope 仅 `tests/cases/token/lexical` + `docs/cover6-core-string.md`）。
- 修复内容：两个 E 夹具补 `// xl:end`；`xl:expect` 改为语料里已用过的产品标签
  （`Let,TernaryOperator,PropertyAccess`；F 夹具 `Let,Function,Class,ObjectLiteral,MethodDeclaration`）；
  幽灵标签移入 `xl:absent`；未知标签删除。`docs/cover6-core-string.md` §7 增补修复记录并更正「环境问题」表述。
- 合并：**`1b8e2060`** `merge: cover6-fix-fixture-meta`（第 5 条合并；父链 `ff2ea1e8` + `4d659ea9`）。

### 9.3 合并后复核读数（只做短复核，未重跑 7 项端到端）

| 检查 | 实测 |
| --- | --- |
| 主仓 HEAD / 工作区 | **`1b8e20604c9d783cd7ef1f4f42891f3a54805cd9`**；`git status --porcelain` 空 |
| 合并链 | `99f286d8..HEAD` = **5 条** merge：`221b24ee` / `59c469cc` / `108b1767` / `ff2ea1e8` / **`1b8e2060`** |
| 改动范围（`ff2ea1e8..HEAD`） | 只 5 文件：`docs/cover6-FINAL.md`(A)、`docs/cover6-core-string.md`(M)、3 个 E/F 夹具(M)；**无产品代码、无 core** |
| core 不变性 | `git diff 99f286d8..HEAD -- core` 与合并前同 hash（`44f0591f36077aa1c2b7a386a62f67b01cc1aaf7`）；仍 **9 文件**、无新增 |
| `cases:check` | **1717 条用例 / 0 条不合格 / exit 0**（合并前 3 不合格 → 清零） |
| 夹具头抽查（TAGS/GHOST_TAGS） | 3 个夹具 `xl:expect` 标签全部 ∈ `TAGS`；`xl:absent` 标签全部 ∈ `GHOST_TAGS`；2 个 E 夹具（覆盖层）有 `// xl:end`，F 夹具非覆盖层无需 `xl:end` —— **BAD 0** |
| token-ast | **total 1713 / ok 1703 / ts-invalid 10 / crash 0 / diff 0 / known-gap 0**（与合并前一致） |
| ast-json / diff | **5784/5784 cj-ok**；**5784/5784 完全一致，结构/位置/字段差 0/0/0**（独立克隆更新到新 HEAD 后重跑，未变） |
| 7 项 A–G / real-dts / tsc / xl_check | 本轮未重跑（产品代码零变化；§3/§7 读数继续有效） |

### 9.4 结论更新

- 终验结论由 **「PASS（附 1 条非阻塞异常）」** 更新为 **「PASS（无阻塞项）」**；
  §1 的「若列为 blocking 则 CONDITIONAL」提醒**不再适用**（`cases:check` 已 0 不合格）。
- §7.1 保留为历史记录（异常原文），其后续状态以本附录为准。
- 回滚点更新：整体回滚仍为 `99f286d8`；第 5 条合并可单独 `git revert -m 1 1b8e2060`（只撤夹具头修复，
  不影响 4 条 core 改动）；本附录所在文档提交可单独 `git revert <本次 docs 提交>`。

