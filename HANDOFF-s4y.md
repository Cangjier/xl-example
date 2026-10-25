# HANDOFF — Stage 4y（possible-statement：switch 子句级语句 / 块内 class 壳）

分支 `feature/possible-statement-s4y`，基线 `feature/possible-statement` @ `5cc01c06`。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4y`（node_modules 为 junction）。

## 0. 结论先行（不伪造绿）

| 目标 | 状态 |
| --- | --- |
| 1. switch 子句级语句接管 | **未交付：默认关（安全回退）**。候选 / 挂载 / 收集分支全部落地并逐条验证过树（stage4y 20 条 XML==legacy、AST==TS、fallback 0），但壳在 `;` 处**不收口**：接管只在「子句最后一条语句」这一形态上完整，`case 1: a; b;` 只接第一条，`case 1: f(); case 2: { g(); }` 会把后续 case 体的目录挂载吞掉（`BlockBodyStatementCount` 0）。`StatementRouteUtil.EnableSwitchCaseClause` 默认 **false**，行为逐位回到 Stage 4s。 |
| 2. 块内 class 壳化 | **候选路径落地、默认关**：新增 `StatementRouteUtil.EnableBlockClassShell`（默认 false）。打开后 `{ class C {} }` body=1、`{ class C { m(){ let y = 1; } } }` body=2、`{ class C extends B {} }` body=1，四条 XML==legacy、fallback 0；`{ class C {} f(); }` body=0（见 §2 的边界）。默认关 = 全表逐位回到基线。 |
| 3. 专用 cases | `tests/statement-possible/case-clause-cases.json` 新组 `stage4y` 20 条（默认关态的 XML/AST/fallback 门）；`tests/statement-possible/s4y-case-clause-takeover.mjs` 计数探头：断言安全态（mount=0 / shell=0 / XML==legacy / 无 fallback），并把打开态读数逐条打印成 `ON-STATE` 诊断行。 |
| 4. 集成收敛 | 见 §3 的全表读数（逐项 exit 0 才记绿）。 |
| 5. 预算 | 9 轮预算内未完成目标 1；按纪律交付安全回退 + 根因/症状证据，不伪装成已接管。 |

## 1. switch 子句级语句：设计、实测症状、为什么默认关

### 设计（不用「伪 Bracket 宿主」）

s4u/s4w 的方案 A 是给子句 units 造一个只在 possible 层存在、不进树的**伪 Bracket**。代价是字符路由必须
把后续单元送进一个凭空插进宿主 `Data` 的括号，`BuildCaseBlock` 还要在收口时摘掉它；4s 已证明「形状的
宿主假设错一格」会直接抛 `SourceRange is not set`，而伪括号没有源码区间。

本轮改用**已经存在的宿主**：`switch (x) { … }` 的 **case 块括号**本来就是子句语句的宿主。它的目录里
只放一个新候选 `CaseClauseStatementPossibleShape`（终结候选 `BlockBodyWaitingPossibleShape`），
**绝不放块体目录**（4p 的抛错根因就是块体目录的表达式 / 变量候选把整段 `case <表达式>:` 当一条语句建壳）。

- 候选在非起点格一律 `Uncertain`、绝不 `Reject`（`CatalogGuide` 的 `Reject` 是永久删除，而这个目录只有
  一个候选，在 `case` / 表达式 / 冒号格上判死会让目录从此停摆）。
- 起点判据 `IsClauseStatementStart` 只读宿主 `Data`：当前单元 basic、非 trivia、非 `{`、非 `case`/`default`；
  前一个非 trivia 单元是 `:`（子句第一条）或已建语句形状 / `;`（同一子句后续）；再往回找最近的
  `case` / `default`，按 **`BuildCaseBlock` 同一份三元深度算法**定位子句冒号并要求吻合。
- 建壳与 `BlockPossibleShape.BuildByIndex` 逐字同构（`Kind = ShellBlock` + `BodyKind = BodyKindBlock`、
  终结候选 `StatementKind = 0`、`Pos` = 前一个非 trivia 单元的 `EndIndex`）。
- 收口侧只加一处：`BuildCaseBlock` 的子句循环遇到非 basic 单元（已收口语句形状）时按序
  `clause.Add(unit)` 收集。`CaseBlockShape` / `CaseClauseShape` 一行未改。

### 实测症状（打开 `EnableSwitchCaseClause` 的测试进程）

- 树永远正确：stage4y 20 条（含 `case 1: f();`、`case 1: a; b;`、`case a?b:c: f();`、`default: f();`、
  `case 1: if(x){y;}`、嵌套 switch、对象 / 标签 / 空 switch 陷阱）**XML==legacy、AST==TS、两次解析一致、
  fallback 0**。
- 接管不完整：`case 1: f();` 能建壳（mount=1 / shell=1），但 `case 1: a; b;` 只有第一条建壳（shell=1，期望 2），
  `case 1: f(); case 2: g();` 只接第一条，`case 1: f(); case 2: { g(); }` 的 case 体接管计数丢失
  （`BlockBodyStatementCount` 0，期望 1）。
- **根因症状**：壳在 `;` 处不收口。壳一直涨到 case 块的 `}`，`ExitOrPre` 用 `LastCodeInItem` 整体建树、
  `BuildStatement` 读不完 → 抛错 → `DetachShell` 退回 raw（所以树仍逐字节等于 legacy）。两套族标记
  （`Kind = ShellStatementFamily` 与 `Kind = ShellBlock`）都复现同一症状；根因未定位到
  `StatementEndPossibleShape` 对「宿主是 case 块括号」的具体假设之前，按纪律默认关，不拿树正确冒充接管。

### 默认关

`StatementRouteUtil.EnableSwitchCaseClause = false`（`BlockPossibleShape.EnableSwitchCaseClause` 同）：
`OnShellBracketCreated` 不给 case 块括号挂目录，子句语句仍由 `BuildCaseBlock` 的 legacy 递归建，
行为逐位回到 Stage 4s。要转正必须先让壳在 `;` 处收口（收口侧或终结候选的宿主持有假设），再重跑本组
20 条 + 全表。

## 2. 块内 class 壳：根因与门控

`Decide` 对 `class` 返回 `Legacy` 是两条判据叠加：`IsDeclarationHead` 不含 `class`，`IsLegacyKeyword` 含 `class`。
新增 `StatementRouteUtil.EnableBlockClassShell`（**默认 false**）：`Decide` 在 `class` 起点上检查宿主
（`head.Parent`）是不是**块体 `{` 括号**，是则判成 `ShellStatementFamily`（带体声明的边界是 `}`，与
`if` / `while` 同一条 `ScanRoot` 判界），由块体目录里既有的 `ControlFlowStatementPossibleShape` 建壳。
根层 `class` 不受影响，默认关时全表逐位不变。

flag 打开的实测（临时进程内打开）：`{ class C {} }` body=1、`{ class C { m(){ let y = 1; } } }` body=2、
`{ class C extends B {} }` body=1、`{ class C {} f(); }` body=0；四条 XML==legacy、fallback 0。
body=0 的那条是门控打开态的边界（class 壳收口后 `f();` 这一格没有回到块体目录），不是错树。
**默认关**，不参与全表结论；转正需要在打开态重跑全表（ast-json / token-ast / real-dts）。

## 3. 全表读数（本分支实测，最终态 = 两个门控默认关）

`xl_build`：**892 written / 0 error**（2526 warning，既有 W3102/W3103）；`xl_check` 892 / 0 error。
下表是 `tsc` 之后逐项实跑的 exit code 与输出尾部：

| 项 | exit | 读数 |
| --- | --- | --- |
| tsc | 0 |  |
| stage4y-cases | 0 | [statement-possible] groups run=1 skipped=0 / cases pass=20 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=2 distinct=1 /   fallback: "switch (x) { case 1: switch (y) { case 2: f(); } }" |
| s4y-counts | 0 | CLASS-FLAG body=1 xml==legacy=true fallback=false :: { class C extends B {} } / CLASS-FLAG body=0 xml==legacy=true fallback=false :: { class C {} f(); } / ALL PASS (safe rollback state) |
| stage4s | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=20 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4w | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=15 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4p | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=25 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4n | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=28 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4o | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=27 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| r1-asi | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=31 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4b | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=17 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4c | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=42 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| stage4c2 | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=33 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| dev | 0 | [statement-possible] groups run=1 skipped=0 / cases pass=22 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=2 distinct=1 /   fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;" |
| operators-live | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=40 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| harness-all | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=8 skipped=3 / cases pass=101 fail=0 skip=0 known=1 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| double-accept | 0 | [statement-possible] 互斥仪器: cells=821 candidateCalls=5507 endCalls=818 acceptCells=190 waitingNoCandidate=284 / [statement-possible] double-accept 冲突: 0 / [statement-possible] double-accept: cases=120 failed=0 |
| lint | 0 |   Precedence 定义 typescript/tokens/expressions/operator-table.js / [lint] OperatorTable 数字优先级条目=12 / [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| cf-body-takeover | 0 | PASS "switch (x) { case a ? b : c: { g(); } }"  brace=0 body=1 cf=1 /  / [control-flow-body-takeover] cases=46 failed=0 defaultFlags=true totalBrace=34 totalBody=60 |
| cf-takeover | 0 | PASS "en /* c */ : a;"  cf=0 body=0 label=1 /  / [control-flow-takeover] cases=39 failed=0 defaultFlag=true |
| block-body-takeover | 0 | PASS "{ a; if (b) c; d; }"  shells=1 body=3 /  / [block-body-takeover] cases=21 failed=0 defaultFlag=true |
| s4j-function-body | 0 | / `label: { a; }` / 0 / 0 / 0 / PASS / / / `({ m(){ let z=1; } });` / 1 / 1 / 0 / PASS / / / `function f(): void;` / 0 / 0 / 0 / PASS / |
| s4l-await-body | 0 | / `const t = { await: 1 };` / 0 / 0 / 0 / PASS / / / `function s(){ await f(); }` / 1 / 1 / 1 / PASS / / / `async function u(){ await a + b; let z=1; }` / 1 / 0 / 1 / PASS / |
| op-ast-proof | 0 | PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"] /  / [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 / 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条 |
| op-proof | 0 | PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1 /  / [op-proof] group=operators-live cases=40 pass=40 fail=0 / 结构文本已核 40 条、InsertBetween 计数已核 38 条 |
| comma-import-fallback | 0 |       shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=["call(import)"] /  / [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管） |
| validate | 0 |  / 1720 条用例，0 条不合格 |
| ast-json | 0 | [types] cases=450 cj-ok=450 cj-fail=0 / [using-declarations] cases=29 cj-ok=29 cj-fail=0 / total cases=6167 cj-ok=6167 cj-fail=0（47 个构造） |
| ast-json git status typescript/cases | - | empty=True |
| ast-json-diff | 0 | （没有 gap） /  / 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 |
| token-ast | 0 | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 / known-gap:     0 file(s) (none) / non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10) |
| real-dts | 0 | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 / 真实 .d.ts 全量解析成功且 AST 逐节点一致 |
| feas-operator | 0 | [feas-operator] cases=6 pass=6 fail=0 |
| insert-between | 0 | PASS  嵌套插入：wrapper 套 wrapper / PASS  拒绝非法输入 / [feas-operator] insert-between tests=9 pass=9 fail=0 |
| perf | 0 | [perf] scale ratio(200/100)=2.08 ratio(400/200)=2.59（线性≈2.0；>2.5 视为退化告警，不判失败） / [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） / [perf] done |

## 4. 未覆盖 / 剩余风险

1. **目标 1 未交付**：子句级语句仍未接管（默认关）。根因症状是「壳在 `;` 处不收口」，两套族标记都复现；
   下一步应从 `StatementEndPossibleShape` 对宿主括号（case 块括号 vs 块体括号）的假设入手，而不是继续
   调候选判据。
2. **块内 class 壳默认关**：只在测试进程里打开验证过计数 / XML / fallback，没有在打开态跑全表。
3. `{ class C {} } f();` 这类「class 壳之后还有语句」的形态在门控打开态 body=0（见 §2），不是错树。
4. 同一子句里「上一条语句以 `}` / ASI 结束」的后续语句（`case 1: if(x){y;} b;`）不接管（起点判据只认
   「冒号之后」与「上一条语句已建形状 / `;`」），保守边界：树正确、计数少。
5. `EnableSwitchCaseClause` 在 `StatementRouteUtil` 与 `BlockPossibleShape` 各有一份同名门控（候选侧 /
   挂载侧），语义是「任一为 false 都安全退化」，后续应合并成一个。
6. 未改 `StatementBoundaryUtil.IsAsiBoundary`；未手改 `dist/`；ast-json 后 `typescript/cases` 已 checkout。

## 5. 提交

1. `feat(...)`：case 块括号专用目录候选 + `BuildCaseBlock` 收集分支 + 块内 class 壳门控（首版默认开）。
2. `test(...)`：stage4y 20 条 + 计数探头。
3. `docs(...)`：首版 HANDOFF。
4. `fix(...)`：安全回退（两个门控默认关）+ 探头改为断言安全态并打印打开态诊断 + HANDOFF 更新。