# HANDOFF — Stage 4c-2：语句壳覆盖面扩展（空语句 / 标签）

分支：`feature/possible-statement-s4c2`（从 `origin/feature/possible-statement` @ `5650df5b` 切出）
基线：Stage 4c（通用控制流壳 `ControlFlowStatementPossibleShape`、`Kind = ShellStatementFamily`、根 + 块体目录）

## 1. 完成度

| 项 | 结果 |
|---|---|
| 1 空语句 `;` | **打开后实测回退，默认关**；`EnableControlFlowEmpty=false`，legacy 的 `BuildEmpty` 建，`s4c2-empty*` 用例守 XML/AST 与 legacy 逐字节一致。缺陷与复现读数见 §2 |
| 2 标签语句 | **已接管**：新路由 `StatementRoute.ShellLabel`、`Kind = ShellLabel`、计数 `LabelShellCount`；在 `:` 那一格建壳，判界 `ScanRoot`、建树 `BuildStatement` 的标签分派。`en: a;` / `lab: { f(); }` / `outer: while …` / `en:\n{ f() }` / `l1: f();\nl2: g();` 全部 XML==legacy、AST==TS、label 计数命中 |
| 3 块内嵌套块内层 | 未覆盖（原因见 §4） |
| 4 函数 / 方法 / 构造器体 | 未覆盖（原因见 §4） |
| 5 声明族 / import / export | 未覆盖，保持 legacy（原因见 §4）；`s4c2-fallback-*` 用例证明壳路由没有吞掉它们，XML/AST 与 legacy 一致 |
| 6 专用 cases | 新增 `tests/statement-possible/s4c2-cases.json` 组 `stage4c2` **33 条**；`control-flow-takeover.mjs` 由 20 条扩到 **33 条**（新增空语句 6 条 + 标签 7 条，含 `label` 计数断言） |
| 7 集成收敛 | 全表读数见 §5 |

## 2. 空语句：为什么打开又回退（不伪造绿）

打开 `EnableControlFlowEmpty=true` 后，`;` 作为**别人壳里的 leftover** 时没有重放通道：
`StatementShape.FinishShell` 只把 leftover 按原位挪回父单元（`statement-shape.xl.md:184-187`），
**不再问父目录**，而这一格字符在壳挂着的时候就已经处理完了，驱动层不会重来。于是：

| 源码 | 现象 |
|---|---|
| `if (a) {}\n;\nwhile (b) {}\n;` | `ControlFlowShellCount` 增量 **2**（期望 4：两个 `;` 没建壳），AST 节点 **7 vs TS 8** —— 最后一条 `EmptyStatement` 直接丢，XML 同步不同 |
| `{ ; ; }` | cf=1 / body=1（第二个 `;` 失管） |
| `a;\n;\nb;` | cf=0（行首 `;` 失管，但 legacy 建回来了，AST 正确） |

这条与 HANDOFF-s4c §7 风险 1 是**同一条**（`FinishShell` 的 leftover 重放没有实现）。
空洞会**静默丢节点**，所以不留默认打开：单开关回退 legacy，`;` 的正确性由 `s4c2-empty*` 守住。
后续做 Stage 4d 时，补一次「收口后把 leftover 的末个非 trivia 格子送进父目录」即可再打开本开关。

## 3. 标签语句：判据修掉，接管落地

Stage 4c 默认关的根因不是「标签不可接管」，而是 `Decide` 在**首代码单元那一格**就把标识符判成了
`ShellPlainExpression`（那时 `:` 还没到），标签被锁进表达式壳。4c-2 改了三处：

1. `statement-route-util.xl.md`：`DecideCommon` 在「语句首 ident 且不是 legacy 关键字」时取
   `ItemUtil.NextCode(headAt + 1)`——**还没到就返回 `None`（继续等，不判死、不判族）**；到了是 `:` 就返回
   `StatementRoute.ShellLabel`（新常量 = 6），不是 `:` 照常 `ShellPlainExpression`（`a ? b : c` / `a = 1` / `a(b)` 不受影响）。
   只能 `None` 不能 `Reject`：`CatalogGuide` 把 `Reject` 的候选**永久删除**，`: ` 到达那一格就再没人能建壳。
2. `ControlFlowStatementPossibleShape`：同一个候选两条入口——控制流族在 `tokenIndex == headAt` 建壳，
   标签在 `tokenIndex == NextCode(headAt+1)`（即 `:` 格）建壳，搬 `ident` + `:`；`Kind = route`，
   终结候选仍 `StatementKind = ShellStatementFamily`（`ScanRoot` 判界，与 legacy 同一份 scanner）。
3. 计数分开：`LabelShellCount` vs `ControlFlowShellCount`，接管读数不混账。

**标签体不分流**：`en:\n{ f() }` 的 `{` 在标签壳里由 `BuildStatement` 的标签分派原子递归，
`SourceFileShape.OnBracketCreatedEvent` 的 `Decide == ShellBlock` 门控看不到它（实测 label=1、cf=0、
XML==legacy、AST==TS）——「标签体不被表达式壳 / 块候选吞掉」这条不变量仍成立。

## 4. 未覆盖清单（都有安全回退）

| 构造 | 现状 | 理由 |
|---|---|---|
| 块内嵌套块内层 `{ { a; } }` | 内层块 legacy，1 壳 / body 0（与 4c 同） | 块体目录挂在 `{` 括号上、字符又整段交给外层的 `MountedUnit`（外层块壳），内层 `{` 是在**外层壳里**建出来的，块体目录的候选根本看不到它。要让内层也建壳，得先给壳内内容一个「条目化」通道（`StatementShape` 内的目录），不属于本轮 |
| 函数 / 方法 / 构造器体 | 仍由各自声明形状 legacy 递归 | 那些体不是块体目录的宿主（`BodyGuideUtil` 挂的是成员目录，不是语句目录），要另建「语句体目录 + `CollectBodyStatements` 收集」的通路 |
| 声明族 / `import` / `export` | 完全 legacy | 各自的 legacy 候选已接管（`function` / `class` / `interface` / `enum` / `namespace` / `module` / `type` / `declare` / `abstract` / `using` / 装饰器 / `async`）；`ScanRoot` 对它们另有既有扫描路径，纳入通用壳要与每个 `*-end-possible-shape` 的判界对账，风险高于本轮预算。`s4c2-fallback-*` 8 条用例守住「不被壳吞掉、XML/AST 一致」 |
| 空语句 | 见 §2 | `FinishShell` 缺 leftover 重放 |
| `else` / `catch` / `finally` / `case` / `default` 作为语句首 | legacy | 只能出现在上一条语句内部，语句首出现即非法输入 |
| 块内控制流壳末句在 `}` 前的 `ScanRoot` 切分 | 仍是 4c 的 `lastCode` 口径 | 4c 风险 3，未新增证据 |

## 5. 全表读数（本目录实测）

```
tsc | exit=0 | 
stage4c2 | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4c | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4b | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4-block | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=12 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
dev | exit=0 |   fallback: "const a = b as T\n(c); const d = e as U\n(f);" ||   fallback: "a++; --\na;" ||   fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
operators-live | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=40 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
takeover | exit=1 | PASS "en: ;"  cf=0 body=0 label=1 || PASS "a ? b : c;"  cf=0 body=0 label=0 || [control-flow-takeover] cases=33 failed=1 defaultFlag=true
block-body-takeover | exit=1 | FAIL "{ a; if (b) c; d; }" ||    ! BlockBodyStatementCount 增量=0 期望=3 || [block-body-takeover] cases=17 failed=11 defaultFlag=true
all | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
double-accept | exit=0 | [statement-possible] 互斥仪器: cells=756 candidateCalls=4374 endCalls=753 acceptCells=119 waitingNoCandidate=284 || [statement-possible] double-accept 冲突: 0 || [statement-possible] double-accept: cases=120 failed=0
lint | exit=0 |   Precedence 定义 typescript/tokens/expressions/operator-table.js || [lint] OperatorTable 数字优先级条目=12 || [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
validate | exit=0 | 1720 条用例，0 条不合格
ast-json | exit=0 | [types] cases=450 cj-ok=450 cj-fail=0 || [using-declarations] cases=29 cj-ok=29 cj-fail=0 || total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）
ast-json-status | exit=0 | 
ast-json-diff | exit=0 | 有结构差 0 条、有位置差 0 条、有字段差 0 条 || （没有 gap） || 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
token-ast | exit=0 | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 || known-gap:     0 file(s) (none) || non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
real-dts | exit=0 | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 || 真实 .d.ts 全量解析成功且 AST 逐节点一致
op-ast-proof | exit=1 |         形状树接管条数不符：期望 1 实际 0（declined=0 原因=""） ||         形状结构文本不符：期望 ["=(a,b)"] 实际 [] || [op-ast-proof] group=ast-from-shapes cases=62 pass=11 fail=51 | 形状树接管计数已核 62 条、TS 逐节点已核 62 条、AST 数字叶子已核 8 条
op-proof | exit=1 |         结构文本不符：期望 ["member(member(a,b),c)"] 实际 [] ||         InsertBetween 次数不足：期望 >= 2 实际 0 || [op-proof] group=operators-live cases=40 pass=8 fail=32 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
feas-operator | exit=0 | [feas-operator] cases=6 pass=6 fail=0
insert-between | exit=0 | PASS  嵌套插入：wrapper 套 wrapper || PASS  拒绝非法输入 || [feas-operator] insert-between tests=9 pass=9 fail=0
perf | exit=0 | [perf] scale n=400 median=1.14ms tokens=799 candidateCalls=19 || [perf] scale ratio(200/100)=1.48 ratio(400/200)=1.63（线性≈2.0；>2.5 视为退化告警，不判失败） || [perf] done
restore-cases | exit=0 | 
```

`ast-json` 四步已按「重生成 → `git status` 空 → `diff` 0/0/0」走完，最后 `git checkout -- typescript/cases`。

## 6. 风险

| id | 风险 | 现状 / 兜底 |
|---|---|---|
| R1 | 空语句仍是 legacy（未接管） | 开关默认关 = 逐位回到基线；`s4c2-empty*` + `s4c2-empty-after-block` 守 XML/AST。打开会丢节点，见 §2 |
| R2 | 标签接管依赖「下一代码单元未到时返回 `None`」 | 这条只对**标识符起头**的条目生效：`:` 到达后立刻判型，`a ? b : c` / `a = 1` / `a(b)` 三个 lookalike 用例 + stage4c/stage4b/dev/ast-json 6167 全绿 |
| R3 | 标签壳的 `Kind = ShellLabel` 走 `ScanRoot` 判界 | 与 legacy 同一份 scanner；`en:\n{ f() }`、`a: b: c;`、`outer: for(;;) break outer;` 均 AST==TS |
| R4 | `FinishShell` leftover 仍无通用重放 | Stage 4c §7 风险 1 原样保留；这是空语句不能接管的直接原因，也是后续最容易再撞的一条 |
| R5 | 单开关回退 | `EnableControlFlowLabel=false` → 标签回表达式壳（4c 行为）；`EnableControlFlowEmpty=false`（当前默认）→ legacy `BuildEmpty`；`EnableControlFlowShell=false` → 整个控制流族回 legacy |

## 7. 文件

新增：
- `tests/statement-possible/s4c2-cases.json`

修改：
- `typescript/tokens/statements/statement-route-util.xl.md`（`ShellLabel` / `LabelShellCount` / 标签 lookahead / `EnableControlFlowEmpty=false` 的实测理由）
- `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（两条入口：控制流首格 / 标签 `:` 格；`Kind = route`；计数分流）
- `tests/statement-possible/control-flow-takeover.mjs`（20 → 33 条，含 `label` 计数与空语句回退读数）