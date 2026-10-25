# HANDOFF — Stage 4ae（块内 class 转正 / switch 子句单开关 / case gap ①）

分支 `feature/possible-statement-s4ae`，基线 `origin/feature/possible-statement` @ **3573396d**。
工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s4ae`（node_modules 为 junction）。
本分支不 push、不 merge、不改主仓库；未改 `StatementBoundaryUtil.IsAsiBoundary`；未手改 `dist/`（全部由 xl_build 生成）。

## 0. 结论先行

| 目标 | 状态 |
| --- | --- |
| 1. 修两条计数期望并转正块内 class | **已交付**：`EnableBlockClassShell = true` 默认开；`control-flow-body-takeover` 两条 class 期望按实测更新为 body=1/cf=1、body=2/cf=1；46/0、totalBody=62。 |
| 2. 合并 `EnableSwitchCaseClause` 双开关 | **已交付**：唯一来源 `StatementRouteUtil.EnableSwitchCaseClause`；`BlockPossibleShape.EnableSwitchCaseClause` 静态字段已删除；s4y 探针新增「不得再拥有同名 own property」断言；final-matrix 删除对 BP 字段的读取。默认值与语义不变。 |
| 3. case gap ① `case 1: if (x) { y; } b;` | **已修**：shell=2、body=1、XML==legacy、AST==TS、fallback=0。专用组 stage4ae 9/9。 |
| 4. case gap ② `case 1: ; case 2: ;` | **未修**（预算）：仍 file-fallback；未定位到新的一格，判断与 s4ac 相同（FinishShell leftover 重放 / 两条空语句壳之间的父目录重放）。 |
| 5. 专用 cases 扩展 | **已交付**：`case-clause-cases.json` 新增 `stage4ae` 组（9 条 gap 形态：if / if-else / for / while / do / try / class / function / 收尾 if）。 |
| 6. 全表绿 | **是**（读数见 §3，全部本分支实跑；无伪造）。 |

## 1. 计数期望与块内 class 转正（目标 1）

`{ class C {} }` / `{ class C { m(){ let y = 1; } } }` **应当计入** `BlockBodyStatementCount`，与既有 body 计数语义一致：
块体目录里被建壳、收口后被 `CollectBodyStatements` 按序收集的语句都计入（函数声明体里的 `let` 同样计入），
class 壳走 `ControlFlowStatementPossibleShape` 建壳、`StatementBuilder.BuildStatement` 原子建树，
因此 class 语句本身 +1、方法体里的 `let` 再 +1。

实测（`s4y-case-clause-takeover.mjs` CLASS-FLAG 段）：

- `{ class C {} }` body=1 cf=1，XML==legacy，fallback=false；
- `{ class C { m(){ let y = 1; } } }` body=2 cf=1，XML==legacy，fallback=false；
- `{ class C extends B {} }` body=1；
- `{ class C {} f(); }` body=0（class 壳收口后 `f();` 未回到块体目录，属未接管而非错树）。

`control-flow-body-takeover.mjs` 的两条期望因此从 body=0/cf=0、body=1/cf=0 改为 body=1/cf=1、body=2/cf=1
（XML/AST 断言一字未动）；重跑 **cases=46 failed=0，totalBrace=34 totalBody=62**。

## 2. 单开关合并（目标 2）

- 删除 `block-possible-shape.xl.md` 的 `## static field EnableSwitchCaseClause` 整段；
- `OnShellBracketCreated` 的 switch 分支只问 `StatementRouteUtil.EnableSwitchCaseClause`；
- `s4y-case-clause-takeover.mjs`：不再给 `B.EnableSwitchCaseClause` 赋值，改为断言
  `Object.prototype.hasOwnProperty.call(B, "EnableSwitchCaseClause") === false`（防止同名死开关再冒出来）；
- `final-matrix.mjs`：`FACTORY_BLOCK` 删除该字段，注释改为「单一门控」；
- **API 变更**：外部脚本里 `BlockPossibleShape.EnableSwitchCaseClause = false` 现在静默无效，
  必须迁到 `StatementRouteUtil.EnableSwitchCaseClause`；默认值与打开态语义逐位不变。

## 3. gap ① 修法与证据（目标 3）

根因（s4ac 已定位）：子句壳的终结候选统一用 `ShellPlainExpression`，收口判据是 `;` / ASI / EOF；
子句语句以 `}` 收尾时三条都不成立，壳吞掉下一条语句。

修法：`case-clause-statement-possible-shape.xl.md` 的 `BuildByIndex` **按首代码单元分族**：
新增 `IsStatementFamilyHead`（`if` / `for` / `while` / `do` / `try` / `with` / `class` / `function`），
这一族 `Kind = ShellStatementFamily`、终结候选 `StatementKind = ShellStatementFamily`（走 legacy
`StatementScanner.ScanRoot`，在体 `}` 收口），体括号由 `StatementShape.OnBracketCreatedEvent` →
`BlockPossibleShape.TryMountControlFlowBody` 挂块体目录；其余子句语句保持 4aa 的
`ShellBlock` + `ShellPlainExpression` 组合不变。

实测：`switch (x) { case 1: if (x) { y; } b; }` → shell=2、body=1、XML==raw、fallback=false；
stage4ae 9/9（含 `class` / `function` 子句语句），stage4aa 12/12、stage4y 20/20，s4y 探针 ALL PASS。

**保守取舍**：`switch` 不收进该族——嵌套 switch 内层子句接管是 s4ac §5 已记录的独立缺口，打开会把既有
stage4y 的嵌套 switch 壳计数从 1 变成 2，本阶段不顺手改时序。

## 4. gap ②（目标 4，未交付）

`switch (x) { case 1: ; case 2: ; }` 仍 file-fallback；本轮未改 `StatementShape.FinishShell` 的重放逻辑，
未定位到新的具体一格。按纪律不伪造绿，保留在未覆盖清单。

## 5. 全表读数（本分支实跑，默认态）

xl_build：**892 written / 0 error**（2526 既有 W3102/W3103 warning）；`tsc -p tsconfig.json` exit 0。

下面的原始输出是本轮实跑（`ast-json` 后 `git status typescript/cases` 为空，最后已 `git checkout -- typescript/cases`）：
### all exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### double-accept exit=0
[statement-possible] 互斥仪器: cells=825 candidateCalls=5511 endCalls=822 acceptCells=191 waitingNoCandidate=284
[statement-possible] double-accept 冲突: 0
[statement-possible] double-accept: cases=120 failed=0
### lint exit=0
  Precedence 定义 typescript/tokens/expressions/operator-table.js
[lint] OperatorTable 数字优先级条目=12
[lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
### stage4w exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=15 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4s exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=20 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4aa exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=12 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4y exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=20 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4ae exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=9 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### r1-asi exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=31 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4b exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4c exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### stage4c2 exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### dev exit=0
[statement-possible] groups run=1 skipped=0 | cases pass=22 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=2 distinct=1
  fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
### operators-live exit=0
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=1 skipped=0 | cases pass=40 fail=0 skip=0 known=0 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
### s4y-probe exit=0
CLASS-FLAG body=1 xml==legacy=true fallback=false :: { class C extends B {} }
CLASS-FLAG body=0 xml==legacy=true fallback=false :: { class C {} f(); }
ALL PASS
### cf-body exit=0
PASS "switch (x) { case a ? b : c: { g(); } }"  brace=0 body=1 cf=1

[control-flow-body-takeover] cases=46 failed=0 defaultFlags=true totalBrace=34 totalBody=62
### block-body exit=0
PASS "{ a; if (b) c; d; }"  shells=1 body=3

[block-body-takeover] cases=21 failed=0 defaultFlag=true
### cf-takeover exit=0
PASS "en /* c */ : a;"  cf=0 body=0 label=1

[control-flow-takeover] cases=39 failed=0 defaultFlag=true
