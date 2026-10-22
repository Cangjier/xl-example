# cover9 FINAL — 独立终验报告

> 终验成员：`verify`（独立口径：参与过 survey 发现，未写任何修复代码、未参与合并）。
> 只读核验 + 只新增本文件；未改代码 / 用例 / 快照 / 其它 docs；未 push、未 merge。
> 核验时间：2026-10-22（Asia/Shanghai）；仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
> 分支 `feature/quick-parse`。**验证对象的代码面 HEAD = `2a531cb230bedcc672eb62dcbdd6eaad2550ecc4`**
> （九个 merge 的末端；本报告随后以「仅本文件」的 docs-only commit 落盘，未 push），TS 6.0.3 / Node v24.21.0。
> 所有读数均为终验成员在本仓**亲自复跑**（不接受任何作者/合并成员自报）；证据脚本在 `tmp/cover9-verify/`（未跟踪、不提交）。

## 0. 一句话状态

**PASS**：9 个 merge 全部在 HEAD 链上，全量门禁 `ast-json 6167/6167`、`diff 0/0/0`、`token-ast 1715`、
`validate 1719/0`、`real-dts 226/226`、`tsc 0`、`xl_check 0 error`、core 与 `typescript/IMPORTANCE.md` 零 diff、
工作区干净；probe 88 条 **live 全绿**（handoff 44 条原 red 全部转绿、原 green 44 条无回退），
独立抽样 **55 条全部「修复前红（基线 4d2dafe3 build）→ 修复后绿（HEAD build）」**；新增用例 **238 条**
（5929 → 6167）逐 stem 对账一致，用例为 append-only（唯一 1 行「删除」是文件末尾补换行，内容零改动）。

## 1. git / 合并链核验

| 项 | 期望 | 实测 | 结论 |
|---|---|---|---|
| HEAD | `2a531cb2`（merge: cover9-posscompute-type） | `2a531cb230bedcc672eb62dcbdd6eaad2550ecc4` | ✅ |
| 分支 | `feature/quick-parse` | `feature/quick-parse` | ✅ |
| 合并数/链 | 9 个 merge，父链见 §8 | `git log --merges 4d2dafe3..HEAD` 恰 9 条、second parent = 各作者分支 tip，与 `cover9-merge-log.md` 逐条一致 | ✅ |
| 工作区 | 只允许未跟踪 `tmp/` | `git status --short` = `?? tmp/`（跑完全量 ast-json 后仍同） | ✅ |
| tmp 提交 | 无 | `git ls-files \| Select-String '^tmp/'` 为空 | ✅ |
| core / IMPORTANCE | 零 diff | `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` = 0 行 | ✅ |
| 改动范围 | 仅 `typescript/**` + `.gitattributes` + `docs/**` | `git diff --name-only` 47 文件：17 个 `typescript/**` 实现/模板文件、6 份 case + 12 份快照、`.gitattributes`、9 份作者 docs（+本文件）；无 `core/`、无 `tests/`、无 `IMPORTANCE` | ✅ |
| 未 push | 本地 HEAD 即终态 | 未执行 push/merge 操作 | ✅ |

## 2. 全量门禁读数（起点 `4d2dafe3` vs 终点 `2a531cb2`，终验复跑）

| # | 门禁 | 起点（handoff §0/§8，基线） | 终点（本次实测） | 期望 | 结论 |
|---|---|---|---|---|---|
| 1 | `node typescript/cases/ast-json.mjs` | 5929/5929（47 构造） | **6167 / cj-ok 6167 / cj-fail 0（47 构造）** | 6167 | ✅ |
| 2 | `node typescript/cases/ast-json-diff.mjs` | 5929，0/0/0 | **合计 6167：完全一致 6167/6167；结构 0 / 位置 0 / 字段 0** | 同数、0/0/0 | ✅ |
| 3 | `node typescript/cases/token-ast.mjs --quiet` | 1715（ok1705 / ts-invalid10 / crash0 / diff0） | **total=1715 ok=1705 crash=0 diff=0 ts-invalid=10 gap-now-passing=0** | 不差于 1715 | ✅ 未变 |
| 4 | `node tests/parse/validate.mjs` | 1719 / 0 不合格 | **1719 条用例，0 条不合格**（exit 0） | 1719 / 0 | ✅ 未变 |
| 5 | `node typescript/cases/real-dts-ast.mjs` | 226/226/0 崩溃 | **文件 226：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0** | 226/226 | ✅ |
| 6 | `.\node_modules\.bin\tsc.cmd -p tsconfig.json` | 0 | **exit 0，输出 0 字节** | 0 | ✅ |
| 7 | `xl_check(cwd=主仓, paths=["core","typescript"], targets=["ts"])` | 0 error（2461 warning，3 E2004 孤儿） | **864 file(s), 0 error(s), 2466 warning(s)**；3 个 E2004 孤儿（`dist/ts/core/syntax/{add-result,branch-condition-result,branch}.ts`，仓库既有），W3102/W3103 为既有文档类 warning | 0 error、可接受 warning | ✅ |
| 8 | `git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md` | 空 | 0 行 | 空 | ✅ |
| 9 | `git status --short` | 干净（`?? tmp/`） | `?? tmp/` | 干净 | ✅ |
| 10 | 逐 stem（7 个本轮 stem） | 见 §7 基线列 | **basic-token 221、end-build 251、end-compute 318、missing-end 142、missing-possible 157、possible-build 198、possible-compute 205，全部 cj-fail=0** | 见 §7 | ✅ |

命令与原始输出：`tmp/cover9-verify/{gates.ps1,gates-summary.txt,ast-json.log,ast-json-diff.log,token-ast.log,validate.log,real-dts.log,tsc.log,probe.log}`。
门禁脚本退出码：ast-json/diff/token-ast/validate/real-dts/tsc 全 0；probe 1（预期，见 §3）。

## 3. probe 核验（`node tests/cover9/probe.mjs`，非 --quiet，终验复跑）

- 汇总：**`candidates: 88  red=0  green=88  ts-invalid=0`**；分组 `A: total=45 red=0 green=45`、`B: 22 red=0 green=22`、
  `C: 21 red=0 green=21`。
- `[FAIL] 44 条候选的「存储值 vs 实测」不一致`（exit 1 = **预期**）：存储值 44 条 red 恰为
  **A01–A21、B01–B04、B06–B16、C01–C08**（21+15+8=44，逐行 live=`green`），与 handoff §3 的 44 条 red 清单完全一致。
  `tests/cover9/candidates.json` **未被修改**（`git diff` 无该文件；存储的原始红基线是修复证据，保持不动）。
- 原 green 44 条：无一条 green→red（88 条 live 全绿即包含它们）。
- 结论：**handoff 44 条 red 全部 live=green，green 无回退**。✅

## 4. 独立抽样：「修复前红 → 修复后绿」55/55

脚本 `tmp/cover9-verify/verify-sample.mjs`：同一 input 分别用
**main** = 主仓 `build/ts`（HEAD 2a531cb2）与 **base** = `xl-example-set\cover9-infra` 克隆的 `build/ts`
（钉 `4d2dafe3` 的基线构建，只读）跑 `SourceFileRunner.Parse`，与 TS 6.0.3 AST 三栏对拍。
判定：main=green 且 base=red-*（原 red 候选/新增用例行）；原 green 对照要求两侧都 green。
结果：**samples=55 ok=55 bad=0**（明细 `tmp/cover9-verify/sample-results.json`）。

| 抽样面 | 条数 | 覆盖 | 实测（main / base） |
|---|---|---|---|
| handoff red（A/B/C 各抽） | 21 | A01,A03,A07,A12,A16,A17,A19,A20；B01,B02,B06,B10,B12,B15,B16；C01,C02,C04,C06,C07,C08 | 全 main=green / base=red-crash 或 red-diff ✅ |
| handoff green（无回退） | 6 | A22,A28,B05,B17,C09,C14 | 全 main=green / base=green ✅ |
| survey red（X/Y/Z/O 各抽） | 19 | X01,X03,X07,X14；Z01,Z03,Z07,Z12,Z17,Z19,Z23；Y01,Y03,Y07,Y13；O01,O02,O08,O12 | 全 main=green / base=red-crash 或 red-diff ✅ |
| 新增用例行（7 stem 共 9 行） | 9 | basic-token、end-build×2、end-compute、missing-end、missing-possible、possible-build、possible-compute×2 | 全 main=green / base=red-* ✅ |

## 5. 本轮修复清单（handoff 44 + survey 75 + 附加来源）

### 5.1 handoff 44 条（A/B/C 组）

| id 范围 | §6 类别 → targetStem | 修复文件（file:line 以作者 docs/合并日志为准） | 修复摘要 | 新用例 |
|---|---|---|---|---|
| A01–A16 | end compute → `end-build` | `statement-scanner.xl.md:966/986/1004/1016`（HasLineBreakBefore / IsDecoratedDeclarationStart / IsDeclarationKeyword / DecoratedHeadKeyword，唯一判据）；`source-file-end-possible-shape.xl.md:450-497`（装饰器声明头不设边界）；`function-declaration-possible-shape.xl.md`、`export-declaration-possible-shape.xl.md` | 无体声明 / import= 后「换行 + @（可跨行）+ 声明词」识别为下一条装饰器声明的起点，声明头跨行不切断 | 39 |
| A17–A21 | 缺少 possible → `missing-possible` | `statement-builder.xl.md:1070-1104/1372-1400`（BuildDecoratedVariableStatement / BuildVariableStatement(decoratedFirst?)）；`source-file-end-possible-shape.xl.md`（ScanDecoratedHead 变量族）；`function-declaration-possible-shape.xl.md:303-327` | `@dec` 贴 const/let/var 的装饰器变量语句入分派表并按 TS children 顺序建树 | 22 |
| A17–A21 之外 C07/C08 | 缺少 possible → `missing-possible` | `source-file-end-possible-shape.xl.md:376`（BuildTrailingDeclaration + 装饰器分派） | 无体 ambient 声明之后的尾随 `global {}` 归 ModuleDeclaration（而非函数体/表达式） | （同上 22） |
| C01 | end build → `end-build` | `source-file-end-possible-shape.xl.md`（多语句分界） | `let` ⏎ `let = 1` 切成 TS 的 `VariableStatement` 而非两条 ExpressionStatement | （同上 39） |
| B01–B04 | possible build → `possible-build` | `type-builder.xl.md:12/492/511`（引入共享 `run/line-terminator.xl.md`）+ `:1828` 类型实参同行守卫 | `as T` 类型位行终止符 LF/CR/LS/PS 统一，换行后 `<b>` 不再被吞成类型实参 | 25 |
| B06–B14 | end compute → `end-compute` | `type-alias-declaration-possible-shape.xl.md:279/230/314-334` + `statement-builder.xl.md:1154` | type alias 的 `<` 换行边界判为新语句起点（TypeAssertion），不再吞进类型 | 23 |
| B15–B16 | possible build → `possible-build` | `type-builder.xl.md:1997`（ParseTypeQuery 同行守卫）+ `expression-builder.xl.md:466` | `as typeof f` 后换行 `<T>(1)` 回二元层（比较链），不再当 TypeQuery 类型实参 | （同上 25） |
| C02/C03 | possible build → `possible-build` | `expression-builder.xl.md`（yield/await 上下文） | 顶层 script / 普通函数里 `yield` / `await` 按 Identifier 建树 | （同上 25） |
| C04–C06 | end compute → `end-compute` | `statement-possible-shape.xl.md:98-105/206-226/278-302` | ASI 边界留下的边界 token 在 EOF 不再与根终结候选共存（让位并建收尾语句） | （同上 23） |

### 5.2 survey 新增 75 条（X/Y/Z/O 组）

| id 范围 | §6 类别 → targetStem | 修复文件（file:line） | 修复摘要 | 新用例 |
|---|---|---|---|---|
| X01–X15 | basic token → `basic-token` | `typescript/run/typescript-symbol-template.xl.md:19-25/30-31/42-45/54-56` | `IsWhiteSpace` 补 `case "\u0085"`（TS 的 `isWhiteSpaceSingleLine` nextLine；**不是** LineTerminator）；core 零改动，用户已裁定按 TS 口径 | 25 |
| Z01–Z16 | possible compute → `possible-compute` | 5 文件：`type-alias-declaration-shape.xl.md:117-121`（IsTypeAliasHead 同行判据）、`type-alias-declaration-possible-shape.xl.md:201-212`、`expression-statement-possible-shape.xl.md:255-275`、`statement-builder.xl.md:387-402`、`module-block-shape.xl.md:199-215/428-432` | `type` 声明头要求名字与 `type` 同行；换行时 `type` 是标识符、别名另起语句（根级/块/模块体/建树同判据） | 16 |
| Z17–Z18 | possible compute → `possible-compute` | `enum-declaration-possible-shape.xl.md:79-88`、`interface-declaration-possible-shape.xl.md:82-88`（候选）+ `enum/interface-declaration-shape.xl.md:111-115/106-108`（建树） | enum/interface 的 `declare` 修饰词要求同行（移植 class 的 HasLineBreakBefore 守卫） | 25（与 Z19–Z24 合并） |
| Z19–Z24 | possible compute → `possible-compute` | `type-builder.xl.md:958-1003`（ParseTypeMember readonly 普通名分支）、`:1018-1021`（new 构造签名） | 成员修饰词 `readonly`/`new` 要求同行；换行时它们是成员名（TS 的无类型 PropertySignature），下一行另起成员 | （同上 25） |
| Y01–Y17 | 缺少 end → `missing-end` | `source-file-end-possible-shape.xl.md:910-923/943-951`、`export-declaration-possible-shape.xl.md:374-378/441-445/1331-1359` | EOF 兜底的匿名无体 `export default function` 传 ambient=true + allowAnonymous=true；并加 IsNewDeclarationAfterLineBreak 防止无体签名把下一条声明的 `{}` 当函数体 | 27 |
| O01–O07 | end build → `end-build` | `source-file-end-possible-shape.xl.md:377-400/568-574`（IsInsideExportModifierChain） | EOF 多语句分界识别未完成修饰词链（export default / export as namespace），不把声明头从中间切开 | 18 |
| O08–O19 | possible build → `possible-build` | `class-declaration-shape.xl.md:101`（HasNoName）、`statement-builder.xl.md:562`、`module-block-shape.xl.md:555-556` | 块/语句位匿名 `class {}` 按 TS 静默恢复形建无名字 ClassDeclaration（用户已裁定追恢复 AST） | 18 |

### 5.3 新用例计数对账（238 = 6167 − 5929）

39(endbuild) + 22(missingpossible) + 23(endcompute) + 25(possiblebuild) + 25(basictoken) + 18(possbuild-class)
+ 25(posscompute-decl) + 45(missingend：missing-end 27 + end-build 18) + 16(posscompute-type) = **238** ✅。
逐 stem 快照基线/终点计数（用 `git show 4d2dafe3:` 的 `*.ts-ast.json` 与本工作区快照核对）：
basic-token 196→221(+25)、end-build 194→251(+57=39+18)、end-compute 295→318(+23)、missing-end 115→142(+27)、
missing-possible 135→157(+22)、possible-build 155→198(+43=25+18)、possible-compute 164→205(+41=25+16)；
7 个 stem 合计 1254→1492(+238)，全量 5929→6167 ✅。

## 6. 用例只增不改 / 字节核验

- `git diff 4d2dafe3..HEAD -U0 -- 'typescript/cases/*.ts'`：7 个 stem 的 hunk 全部是 `@@ -X,0 +Y,M @@`
  （纯插入、位置在各文件末尾），**无历史行删除/重排/改写**；`possible-build.ts` 的唯一 1 行「删除」是
  `-a?./*c*/<T>(b);\ No newline at end of file` → `+a?./*c*/<T>(b);`，即**文件末尾补换行**，行内容零改动。
  其余 6 个 stem 的删除行数为 0（numstat：`46/0、106/0、40/0、51/0、49/0、91/1、88/0`，第二列为删除数）。
- `.gitattributes`：`git diff` 为纯追加 9 行（3 段注释 + `end-compute.ts` / `possible-build.ts` /
  `possible-compute.ts` 各 1 行 `-text`），既有 10 行零改动；文件为合法 UTF-8（1340 字节，0 个替换符），
  与 `basic-token.ts -text` 等历史规则共存，无重复。
- 含 CR / NEL / LS / PS 的 case 文件，HEAD blob 与工作区字节**完全一致**（`git show HEAD:<file>` 对拍）：
  basic-token 21012B / CR5 / NEL33 / LS10 / PS7；end-build 21961B / CR1 / LS1 / PS1；
  end-compute 17950B / CR3 / LS28 / PS4；possible-build 19901B / CR7 / LS3 / PS1；
  possible-compute 17322B / CR1 / LS1 / PS1；missing-end 15996B、missing-possible 15835B（无行终止符）。
- 快照：合并后重跑全量 `ast-json.mjs` 无二次改动（`git status` 仍只有 `?? tmp/`），未手工拼 JSON。

## 7. 逐 stem 用例数（新增 238 的分布）

| stem | 起点 4d2dafe3 | 终点 2a531cb2 | 增量 | 来源组 |
|---|---|---|---|---|
| basic-token | 196 | **221** | +25 | X（NEL） |
| end-build | 194 | **251** | +57 | handoff A01–A16 + C01（39）+ O01–O07（18） |
| end-compute | 295 | **318** | +23 | handoff B06–B14 + C04–C06 |
| missing-end | 115 | **142** | +27 | Y01–Y17 |
| missing-possible | 135 | **157** | +22 | handoff A17–A21 + C07/C08 |
| possible-build | 155 | **198** | +43 | handoff B01–B04/B15/B16/C02/C03（25）+ O08–O19（18） |
| possible-compute | 164 | **205** | +41 | Z01–Z16（16）+ Z17–Z24（25） |
| 7 stem 合计 | 1254 | **1492** | **+238** | 全量 5929 → **6167** |

## 8. 合并记录 / 回滚点

| 轮 | merge sha | parents | 内容 | 回滚点（= 该 merge 前 HEAD） |
|---|---|---|---|---|
| 起点 | `4d2dafe3` | — | cover9-prep（88 候选，red44/green44） | — |
| 1 | `3a47b46d` | `4d2dafe3` + `aa5c07af` | cover9-endbuild（A01–A16 + C01，+39） | `4d2dafe3` |
| 2 | `b465cf6e` | `3a47b46d` + `12d90175` | cover9-missingpossible（A17–A21 + C07/C08，+22） | `3a47b46d` |
| 3 | `bf70da06` | `b465cf6e` + `40c615cc` | cover9-endcompute（B06–B14 + C04–C06，+23） | `b465cf6e` |
| 4 | `11d11e5a` | `bf70da06` + `1ffb59ac` | cover9-possiblebuild（B01–B04/B15/B16/C02/C03，+25） | `bf70da06` |
| 5 | `b90f85f3` | `11d11e5a` + `1461e52c` | cover9-basictoken-nel（X01–X15，+25） | `11d11e5a` |
| 6 | `c8009972` | `b90f85f3` + `5f2df43a` | cover9-possbuild-class（O08–O19，+18） | `b90f85f3` |
| 7 | `f014e903` | `c8009972` + `c465f68f` | cover9-posscompute-decl（Z17–Z24，+25） | `c8009972` |
| 8 | `f8579977` | `f014e903` + `43c97af4` | cover9-missingend（Y01–Y17 + O01–O07，+45） | `f014e903` |
| 9 | `2a531cb2` | `f8579977` + `7b7a2c68` | cover9-posscompute-type（Z01–Z16，+16） | `f8579977` |

回滚点链：`4d2dafe3 → 3a47b46d → b465cf6e → bf70da06 → 11d11e5a → b90f85f3 → c8009972 → f014e903 → f8579977 → 2a531cb2`。
整体回滚 = `git reset --hard 4d2dafe3`；单批回滚 = revert 对应 merge。与 `xl-example-set\cover9-merge-log.md` 逐条一致 ✅。

## 9. basic-token 结论（用户裁定项）

- **已修**：`U+0085`（NEL）按 **TS 词法**计入空白（TS `isWhiteSpaceSingleLine` 的 `CharacterCodes.nextLine`；
  ECMAScript 的 WhiteSpace/LineTerminator 都**不**含 NEL）。修点在 `typescript/run/typescript-symbol-template.xl.md`
  的 `IsWhiteSpace` switch（`:54-56` 补 `case "\u0085"`），**core 零改动**，与 cover5 的 ts 层覆写同路径；
  用户已明确裁定「按 TS 口径修」。X01–X15 共 15 形全部转绿（+25 条用例）。
- **口径注意（已写入代码注释与用例）**：NEL **不是**行终止符（TS `isLineBreak` 不含 0x85），
  `return<NEL>1` 仍是带表达式、语句之间靠 `;` 分句；不得把 NEL 放进 `LineTerminator`。
- **其余探测边界（survey 已实测为绿、不是问题，下一轮勿重复）**：ES 全空白集（NBSP/U+1680/U+2000–200B/
  U+202F/U+205F/U+3000/LS/PS）、BOM 多位置、shebang（LF/CRLF/CR/LS/PS/无换行/空体）、`$`/`\uXXXX`/`\u{…}`
  标识符、正则 vs 除号上下文、模板/标签模板 raw CR/LS/PS 归一化、`#`/`@`/反引号边界；`U+180E` 等为 TS 非法（ts-invalid，
  不入尺子）。详见 `xl-example-set\cover9-survey-report.md` §2/§6。

## 10. 作者 docs 核验

9 份作者报告均存在且含「四问 + 逐条红→绿证据 + 新增用例数 + 遗留」：
`docs/cover9-endbuild.md`(17478B)、`cover9-missingpossible.md`(16295B)、`cover9-endcompute.md`(17210B)、
`cover9-possiblebuild.md`(17197B)、`cover9-basictoken.md`(14127B)、`cover9-possbuild-class.md`(11677B)、
`cover9-posscompute-decl.md`(16677B)、`cover9-missingend.md`(19422B)、`cover9-posscompute-type.md`(16752B)。
抽查（endbuild / missingend / posscompute-type / basictoken）的 §2 修复点 file:line、§四问、§逐条证据结构完整，
与合并日志、§5 修复清单一致 ✅。

## 11. 遗留风险 / 下一批建议（汇总各作者 docs + 终验观察，均**未**在本轮修）

1. **W1：无体函数签名把 `{…}` 当函数体**（`cover9-missingend.md:210-212`）：
   `export default function (): void` ⏎ `z = {};` / `foo({});` 仍会被当函数体（吞掉后面的语句）。
   彻底修需要候选按「参数表 / 返回类型 / 下一语句起点」三分，属 end build/missing-end 下一批。
2. **W2：TS 自身非法/恢复形的边界**：`export type` ⏎ `T = 1`、`export declare` ⏎ `function` 等 TS diag≠0 形
   （posscompute-type 记录）；TS 静默恢复形仅按用户裁定追了匿名 `class {}`，更松的恢复形（如
   `class extends {}`、块内 `declare class {}` 的合法性）未追（`cover9-possbuild-class.md` §7）。
3. **W3：模板块成员里的 `declare` ⏎ `enum/interface`** 仍 red-diff（`declare module 'm' { declare` ⏎ `enum E { A } }`）：
   需要动 `module-block-shape` 的成员分派，posscompute-decl 写 scope 未覆盖（`cover9-posscompute-decl.md` §9 遗留 1）。
4. **W4：`type` 判据之外的同族面**：`IsAsiBoundary` 的 `<` 判边界依赖调用方换行守卫；
   `StatementPossibleShape` 的 EOF 让位带 `ItemStart > 0` 前提（整份文件只有一条收尾语句时仍走老路，当前语料不 crash）
   —— `cover9-endcompute.md` §10 登记为隐患。
5. **W5：手写空白表未统一**：`ExpressionBuilder.IsWhitespaceChar`（`expression-builder.xl.md:751`）与
   `StatementScanner.NextChar/NextWord` 仍是手写 `" \t\r\n\v\f"` 表，未接 `LineTerminator`/`IsWhiteSpace`
   共享判据（本轮 X 组不需要它即转绿；属「空白判定路径统一」下一轮候选）。NEL 也不能作为行终止符加进去。
6. **装饰器面的两处实现一致性**：`StatementScanner.IsDecoratedDeclarationStart` 与
   `statement-builder.ScanDecoratedHead` 是两条路径（约定同一判据）；`@dec` ⏎ `export enum/function/type`
   一类仍会退回表达式兜底（`cover9-endbuild.md` §8 遗留，probe 候选外，未修）。
7. **块内 `{ declare function gf(): void` ⏎ `global {} }`** 仍 red-diff（块级 BuildFunctionDeclaration 按
   `IsBodyBrace` 找体；`cover9-missingpossible.md` §9 遗留 1），属 end-build/下一批路径。
8. **`candidates.json` 存储值仍是 44 条红基线**：这是刻意保留的「修复前红」证据（probe 因此 exit 1），
   **不要更新**；下一轮若想 probe exit 0，应另存新基线或改 probe 的存储校验口径。

## 12. 声明

- 终验成员**未改**任何 tracked 代码/用例/快照/其它 docs；本文件是唯一新增/修改文件。
- **未 push、未 merge**；九个 merge 的代码面 HEAD 与合并记录一致（`2a531cb2`）；本文件以仅含本文件的
  docs-only commit 落在其上，提交后工作区除未跟踪 `tmp/` 外干净；`tmp/` 未提交。
- 复核入口（未跟踪）：`tmp/cover9-verify/`（`gates.ps1`、`verify-sample.mjs`、各 `.log`、`sample-results.json`）。
  复跑：
  ```powershell
  cd C:\Users\Admin\Documents\GitHub\xl-example
  git rev-parse HEAD        # 期望 2a531cb230bedcc672eb62dcbdd6eaad2550ecc4
  node typescript/cases/ast-json.mjs            # 6167/6167
  node typescript/cases/ast-json-diff.mjs       # 6167, 0/0/0
  node typescript/cases/token-ast.mjs --quiet   # 1715 (ok1705/ts-invalid10)
  node tests/parse/validate.mjs                 # 1719 / 0
  node typescript/cases/real-dts-ast.mjs        # 226/226
  .\node_modules\.bin\tsc.cmd -p tsconfig.json  # 0
  node tests/cover9/probe.mjs                   # red=0 green=88；44 条存储值偏差 exit 1（预期）
  node tmp/cover9-verify/verify-sample.mjs      # samples=55 ok=55
  git diff 4d2dafe3..HEAD -- core typescript/IMPORTANCE.md   # 空
  git status --short                            # 仅 ?? tmp/
  ```

**终验结论：PASS。**
