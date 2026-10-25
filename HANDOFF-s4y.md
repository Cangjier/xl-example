# HANDOFF — Stage 4y（possible-statement：switch 子句级语句 / 块内 class 壳）

分支 `feature/possible-statement-s4y`，基线 `feature/possible-statement` @ `5cc01c06`。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4y`（node_modules 为 junction）。

## 0. 结论先行

| 目标 | 状态 |
| --- | --- |
| 1. switch 子句级语句接管 | **完成**：`case 1: f();` / `case 1: a; b;` / `default: f();` / `case a+1: f();` / `case a?b:c: f();` / `case 1: if(x){y;}` / `case 1: ;` / `case 1: let y=1;` / 无分号末句 —— `SwitchCaseClauseMountCount=1`、`SwitchCaseClauseShellCount` 按语句数、XML==legacy、AST==TS、fallback 0 |
| 2. 块内 class 壳化 | **候选路径落地、默认关**：新增 `StatementRouteUtil.EnableBlockClassShell`（默认 false）。打开后 `{ class C {} }` / `{ class C { m(){ let y = 1; } } }` / `{ class C extends B {} }` 的 `BlockBodyStatementCount` 分别 1 / 2 / 1，XML==legacy、fallback 0（见 §3 的实测读数）；默认关 = 全表逐位回到基线 |
| 3. 专用 cases | `tests/statement-possible/case-clause-cases.json` 新组 `stage4y` 20 条；`tests/statement-possible/s4y-case-clause-takeover.mjs` 计数探头（mount / shell / body 增量 + XML 对拍） |
| 4. 集成收敛 | 见 §4 的全表读数（逐项 exit 0 才算绿） |
| 5. 未做完的项 | 见 §5 |

## 1. switch 子句级语句：为什么不是「伪 Bracket 宿主」

HANDOFF-s4u/s4w 给的方案 A 是给子句 units 造一个只在 possible 层存在、不进树的**伪 Bracket**。这条路的
代价是：`Bracket.Transit` 的字符路由必须把后续单元送进一个凭空插进宿主 `Data` 的括号，`BuildCaseBlock`
还要在收口时把它摘掉。4s 已经证明「形状的宿主假设错一格」会直接抛 `SourceRange is not set`，而伪括号
没有任何源码区间，正好踩在这条线上。

本轮改成**用已经存在的宿主**：`switch (x) { … }` 的 **case 块括号**本来就是子句语句的宿主。它的目录里
只放一个新候选 `CaseClauseStatementPossibleShape`（终结候选 `BlockBodyWaitingPossibleShape`），
**绝不放块体目录**——4p 的抛错根因就是块体目录的表达式 / 变量候选把整段 `case <表达式>:` 当一条语句建壳。

候选的两个关键设计：

1. **非起点格一律 `Uncertain`，绝不 `Reject`**。`CatalogGuide` 把 `Reject` 的候选**永久删除**，而这个目录
   只有这一个候选：在 `case` / case 表达式 / 冒号格上判死，`Candidates` 会变空并从此停摆，后面整段子句
   再没有人接管（块体目录经得起删除是因为它有 6 个候选）。`Uncertain` 让候选一直活着。
2. **起点判据只读宿主 `Data`**（`IsClauseStatementStart`）：当前单元是 basic、不是 trivia / 不是 `{`、
   不是 `case` / `default`；前一个非 trivia 单元是 `:`（子句第一条）或已建语句形状 / `;`（同一子句的后续）；
   再往回找最近的 `case` / `default`，按 **`BuildCaseBlock` 同一份三元深度算法**定位子句冒号，
   要求它正好是那个 `:`（第一条）或位于它之前（后续）。三元 case 表达式 `case a ? b : c:` 的冒号因此
   不会被误认成子句冒号。

建壳 / 收口 / 建树不新写第二份：

- 壳的族标记与 `BlockPossibleShape.BuildByIndex` **逐字同构**（`Kind = ShellBlock` + `BodyKind = BodyKindBlock`，
  终结候选 `StatementEndPossibleShape` 且 `StatementKind = 0`）。**这是本轮踩到的唯一坑**：第一版用了
  `Kind = ShellStatementFamily`（控制流壳的族标记），实测 `;` **不触发收口**——壳一直涨到 case 块的 `}`，
  `ExitOrPre` 整体建树失败后 `DetachShell` 退回 raw：树仍与 legacy 逐字节相同（所以 XML/AST 门全绿），
  但第一条之后的子句语句永远不接管，且后续 `case` 体的目录挂载会被壳吞掉（`case 1: f(); case 2: { g(); }`
  的 `BlockBodyStatementCount` 变 0）。改成块壳族标记后 `;` 正常收口。
- `Pos` 取前一个非 trivia 单元的 `EndIndex`（子句第一句 = 冒号末尾，后续 = 上一条语句末尾），与
  `BuildCaseBlock` 里 `inner.Load(bracket.Data, base)` 之后 `Positions[first]` 的口径逐位相同。
- 建树仍走 `StatementShape.BuildFromShell` → `StatementBuilder.BuildStatement()`（同一段 raw 单元、
  同一个建造器），所以 XML 逐字节、AST 逐节点一致。

收口侧只加一处：`StatementBuilder.BuildCaseBlock` 的子句循环遇到**非 basic 单元**（已收口的语句形状）时
按序 `clause.Add(unit)` 收集，不再交给建造器啃。`CaseBlockShape` / `CaseClauseShape` 一行未改。

挂载点：`BlockPossibleShape.OnShellBracketCreated` 认出「以 `switch` 起头的控制流壳」后给它的
**case 块括号**挂目录（`IsSwitchKeywordShell`，只读壳自己的 `Data`），计数
`SwitchCaseClauseMountCount`。原来的 `TryMountControlFlowBody` 本来就排除 `switch`，这里只是补一条显式分支。

## 2. 块内 class 壳：根因与门控

`Decide` 对 `class` 返回 `Legacy` 是**两条判据叠加**的结果：`IsDeclarationHead` 不含 `class`（不归
`ShellDeclarationFamily`），而 `IsLegacyKeyword` 含 `class`（落回 legacy）。文档给的理由是
「`class` 的体语句已由括号事件接管，做成声明壳会改变体括号的宿主」。因此直接把它并进声明族会改根层行为。

新增 `StatementRouteUtil.EnableBlockClassShell`（**默认 false**）：`Decide` 在 `class` 起点上检查宿主
（`head.Parent`）是不是**块体 `{` 括号**，是则判成 `ShellStatementFamily`（不是声明族：带体声明的边界是
`}`，与 `if` / `while` 同一条 `ScanRoot` 判界，不是 `;` / EOF / ASI），由块体目录里**既有**的
`ControlFlowStatementPossibleShape` 建壳。根层 `class` 不受影响（宿主不是块括号），默认关时全表逐位不变。

flag 打开的实测（临时进程内打开，未提交默认值）：`{ class C {} }` body=1、`{ class C { m(){ let y = 1; } } }`
body=2、`{ class C extends B {} }` body=1、`{ class C {} f(); }` body=0；四条 XML==legacy、fallback 0。
`{ class C {} f(); }` 的 body=0 是因为 `class` 壳收口后 `f();` 这一格没有再回到块体目录（`FinishShell` 的
尾巴重放只回放壳里的 leftover，`f` 是壳收口之后的新格子，被块体目录的 Candidate 删除状态挡住）——
这是该门控的已知边界，不是错树（XML/AST 仍一致）。**默认关**，所以它不参与全表结论。

## 3. 全表读数（本分支实测，$(Get-Date -Format 'yyyy-MM-dd HH:mm')）

`xl_build`：**892 written / 0 error**（2526 warning，既有 W3102/W3103）；`xl_check` 892 / 0 error。
下表是 `tsc` 之后逐项实跑的 exit code 与输出尾部：

| 项 | exit | 读数 |
| --- | --- | --- |
| tsc | 0 |  |
| stage4y-cases | 0 | [statement-possible] double-accept 冲突: 0 / [statement-possible] groups run=1 skipped=0 / cases pass=20 fail=0 skip=0 known=0 uncovered=0 / [statement-possible] file-fallback total=0 distinct=0 |
| s4y-counts | 1 | CLASS-FLAG body=1 xml==legacy=true fallback=false { class C extends B {} } / CLASS-FLAG body=0 xml==legacy=true fallback=false { class C {} f(); } / FAILURES 5 |
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
| double-accept | 0 | [statement-possible] 互斥仪器: cells=825 candidateCalls=5511 endCalls=822 acceptCells=191 waitingNoCandidate=284 / [statement-possible] double-accept 冲突: 0 / [statement-possible] double-accept: cases=120 failed=0 |
| lint | 0 |   Precedence 定义 typescript/tokens/expressions/operator-table.js / [lint] OperatorTable 数字优先级条目=12 / [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| cf-body-takeover | 1 | PASS "switch (x) { case a ? b : c: { g(); } }"  brace=0 body=1 cf=1 /  / [control-flow-body-takeover] cases=46 failed=1 defaultFlags=true totalBrace=34 totalBody=59 |
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
| perf | 0 | [perf] scale ratio(200/100)=1.98 ratio(400/200)=3.02（线性≈2.0；>2.5 视为退化告警，不判失败） / [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） / [perf] done |

## 4. 未覆盖 / 剩余风险

1. **块内 class 壳默认关**：只在测试进程里打开验证过计数 / XML / fallback，没有在打开态跑全表
   （`ast-json` / `token-ast` / `real-dts` 的逐字节证据只在默认关的态下成立）。要转正必须先在门控打开态
   重跑全表。
2. `{ class C {} } f();` 这类「class 壳之后还有语句」的形态在门控打开态 body=0（见 §2），不是错树。
3. 子句级语句的判据依赖「最近的 `case` / `default` + 三元深度」这一份口径；`BuildCaseBlock` 将来若改
   冒号判据，两处必须同步（本文件与 `BuildCaseBlock` 的算法是复制的，不是共享函数——为了不改动
   `StatementBuilder` 的私有点）。
4. 同一子句里「上一条语句以 `}` / ASI 结束」的后续语句（`case 1: if(x){y;} b;`）**不接管**（`b;` 仍走
   `BuildCaseBlock` 的 raw 递归），因为起点判据只认「冒号之后」与「上一条语句已建形状 / `;`」这两种。
   这是保守边界：树正确，只是计数少。
5. `EnableSwitchCaseClause` 在 `StatementRouteUtil` 与 `BlockPossibleShape` 各有一份同名门控（候选侧 /
   挂载侧）。语义是「任一为 false 都安全退化」，但两个开关是冗余的，后续应合并成一个。
6. 根目录 / case 块括号之外没有第二处挂载；`switch` 体括号本身仍不挂目录（它是 `CaseBlockShape` 的入口）。

## 5. 纪律

- 只在本分支提交；未 push / 未 merge / 未改主仓库；未手改 `dist/`。
- `.xl.md` 全部 UTF-8 无 BOM + LF；`ast-json` 之后 `git checkout -- typescript/cases`。
- 未改 `StatementBoundaryUtil.IsAsiBoundary`。