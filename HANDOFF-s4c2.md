# HANDOFF — Stage 4c-2：语句壳覆盖面扩展（空语句 / 标签）

分支：`feature/possible-statement-s4c2`（从 `origin/feature/possible-statement` @ `5650df5b` 切出）
基线：Stage 4c（通用控制流壳 `ControlFlowStatementPossibleShape`、`Kind = ShellStatementFamily`、根 + 块体目录）

## 1. 完成度

| 项 | 结果 |
|---|---|
| 1 空语句 `;` | **未接管（默认关，安全回退 legacy）**。开关打开后实测会丢 `EmptyStatement`（§2），所以 `EnableControlFlowEmpty=false`；`s4c2-empty*` 10 条守 XML==legacy / AST==TS |
| 2 标签语句 | **路由与候选已落地，默认关（实测回退）**。`StatementRoute.ShellLabel`（=6）、`LabelShellCount`、`:` 格建壳、`Kind = ShellLabel`、`ScanRoot` 判界 + `BuildStatement` 标签分派；打开后 7 条标签用例全绿（label=1、XML==legacy、AST==TS、fallback 0），但**全表回归**（§3），故默认关，标签仍走表达式壳（Stage 4c 行为），`s4c2-label*` 只守正确性 |
| 3 块内嵌套块内层 | 未覆盖（§4） |
| 4 函数 / 方法 / 构造器体 | 未覆盖（§4） |
| 5 声明族 / import / export | 未覆盖，保持 legacy（§4）；`s4c2-fallback-*` 8 条证明壳路由不吞它们 |
| 6 专用 cases | 新增 `tests/statement-possible/s4c2-cases.json` 组 `stage4c2` **33 条**；`control-flow-takeover.mjs` 由 20 → **33 条**（空语句 6 条 + 标签 7 条，含 `label` 计数） |
| 7 集成收敛 | 全表读数见 §5 |

## 2. 空语句：打开后丢节点（证据），因此默认关

`EnableControlFlowEmpty=true` 时，`;` 作为**别的壳里的 leftover** 没有重放通道：`StatementShape.FinishShell`
只把 leftover 按原位挪回父单元（`statement-shape.xl.md`），**不再问父目录**，而那一格字符在壳挂着时就已经
处理完，驱动层不会重来。实测：

| 源码 | 打开后的读数 |
|---|---|
| `if (a) {}\n;\nwhile (b) {}\n;` | `ControlFlowShellCount` 增量 **2**（期望 4），**AST 7 vs TS 8**，XML 同步不同 → 丢一条 `EmptyStatement` |
| `{ ; ; }` | cf=1 / body=1（第二个 `;` 失管） |
| `a;\n;\nb;` | cf=0（行首 `;` 失管，legacy 兜回来，AST 正确） |

这是 HANDOFF-s4c §7 风险 1 的同一条（`FinishShell` 缺 leftover 重放）。会**静默丢节点**，所以不留默认打开；
单开关即可回退，`;` 的正确性由 `s4c2-empty*` 守住。后续补上「收口后把 leftover 末个非 trivia 格子送进父目录
判定一次」即可再打开。

## 3. 标签：路由已落地，打开后全表回归（关键读数）

Stage 4c 默认关的根因是判据：`Decide` 在首代码单元那一格就把标识符判成 `ShellPlainExpression`（那时 `:` 还没到），
标签被锁进表达式壳。4c-2 的修法：`DecideCommon` 在「语句首 ident 且非 legacy 关键字」时取
`NextCode(headAt+1)`，**没到就 `None`（继续等、不 Reject —— Reject 会被 `CatalogGuide` 永久删除）**，到了是 `:`
就返回 `ShellLabel`；`ControlFlowStatementPossibleShape` 在 `:` 那一格建壳（搬 `ident` + `:`）。

打开（`EnableControlFlowLabel=true`）时**标签本身全绿**：

```
stage4c2: 33 pass / 0 fail（含 en: a; / lab: { f(); } / en:\n{ f() } / outer: while… / l1:…l2:… / en: ;）
control-flow-takeover: label=1 逐条命中、XML == legacy、AST == TS、无 fallback
```

**但同一档全表回归**（不是标签用例的错，是「表达式壳晚一格」的全局副作用）：

| 门禁 | 标签关闭（基线） | 标签打开 |
|---|---|---|
| `op-ast-proof` | 62/62 | **11/62**（形状树接管 0） |
| `op-proof` | 40/40 | **8/40**（InsertBetween 0） |
| `block-body-takeover` | 17/17 | **11/17**（`{ a; if (b) c; d; }` body 0） |

根因：标识符起头的条目被推迟一格建壳，`a + b;` 的壳在 `+` 那一格才建，`+` 已经随 raw 单元搬进壳、
`OperatorBody` 没吃到首个运算符 → 形状树接管 0。要保留标签接管，必须换掉「推迟建壳」这条路
（例如在 `:` 格把已建表达式壳改标成标签壳，或给表达式候选一条「先建壳、后判标签」的通道），
那属于下一阶段。**本轮结论：不伪造绿，默认关，标签回表达式壳。**

## 4. 未覆盖清单（都有安全回退）

| 构造 | 现状 | 理由 |
|---|---|---|
| 空语句 `;` | legacy `BuildEmpty` | §2：leftover 无重放，打开会丢节点 |
| 标签 `lbl: stmt` | 表达式壳（4c 行为，XML/AST 正确） | §3：接管需要推迟建壳，全表回归 |
| 块内嵌套块内层 `{ { a; } }` | 内层块 legacy，1 壳 / body 0 | 块体目录挂在 `{` 括号上，字符整段交给外层块的 `MountedUnit`，内层 `{` 是在**外层壳里**建出来的，目录看不到它；要内层也建壳需要「壳内条目化」通道 |
| 函数 / 方法 / 构造器体 | 各自声明形状 legacy 递归 | 那些体不是语句目录的宿主（`BodyGuideUtil` 挂的是成员目录），要另建「语句体目录 + `CollectBodyStatements`」通路 |
| 声明族 / import / export | 完全 legacy | 各自 legacy 候选已接管，`ScanRoot` 对它们有既有扫描路径；纳入通用壳要与每个 `*-end-possible-shape` 对账，风险高于本轮预算。`s4c2-fallback-*` 守住「不被吞掉、XML/AST 一致」 |
| `else` / `catch` / `finally` / `case` / `default` 作语句首 | legacy | 只能出现在上一条语句内部，语句首出现即非法输入 |

## 5. 全表读数（默认档：两个开关均关）

```
tsc | exit=0 | 
stage4c2 | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=33 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4c | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=42 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4b | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=17 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
stage4-block | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=12 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
dev | exit=0 |   fallback: "en:\n{ f() }\nenum E { A }" ||   fallback: "const a = b as T\n(c); const d = e as U\n(f);" ||   fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"
operators-live | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=1 skipped=0 | cases pass=40 fail=0 skip=0 known=0 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
takeover | exit=0 | [control-flow-takeover] cases=33 failed=0 defaultFlag=true
block-body-takeover | exit=0 | PASS "{ if (a) b; while (c) d; }"  shells=1 body=2 || PASS "{ a; if (b) c; d; }"  shells=1 body=3 || [block-body-takeover] cases=17 failed=0 defaultFlag=true
all | exit=0 | [statement-possible] double-accept 冲突: 0 || [statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0 || [statement-possible] file-fallback total=0 distinct=0
double-accept | exit=0 | [statement-possible] 互斥仪器: cells=762 candidateCalls=4779 endCalls=759 acceptCells=170 waitingNoCandidate=263 || [statement-possible] double-accept 冲突: 0 || [statement-possible] double-accept: cases=120 failed=0
lint | exit=0 |   Precedence 定义 typescript/tokens/expressions/operator-table.js || [lint] OperatorTable 数字优先级条目=12 || [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
op-ast-proof | exit=0 | PASS  s3g-optional-add  shapeAst=1 declined=0 texts=["+(member(a,b),1)"] || PASS  s3g-declined-assign  shapeAst=1 declined=0 texts=["=(a,b)"] || [op-ast-proof] group=ast-from-shapes cases=62 pass=62 fail=0 | 形状树接管计数已核 62 条、TS 逐节点已核 62 条、AST 数字叶子已核 8 条
op-proof | exit=0 | PASS  s3g-op-new-chain  texts=["member(new(X),y)"] inserts=1 bodies=1 || PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1 || [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
validate | exit=0 | 1720 条用例，0 条不合格
ast-json | exit=0 | [types] cases=450 cj-ok=450 cj-fail=0 || [using-declarations] cases=29 cj-ok=29 cj-fail=0 || total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）
ast-json-status | exit=0 | 
ast-json-diff | exit=0 | 有结构差 0 条、有位置差 0 条、有字段差 0 条 || （没有 gap） || 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
token-ast | exit=0 | summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0 || known-gap:     0 file(s) (none) || non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
real-dts | exit=0 | real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 || 真实 .d.ts 全量解析成功且 AST 逐节点一致
feas-operator | exit=0 | [feas-operator] cases=6 pass=6 fail=0
insert-between | exit=0 | PASS  嵌套插入：wrapper 套 wrapper || PASS  拒绝非法输入 || [feas-operator] insert-between tests=9 pass=9 fail=0
perf | exit=0 | [perf] scale n=400 median=3.40ms tokens=799 candidateCalls=34 || [perf] scale ratio(200/100)=2.15 ratio(400/200)=2.17（线性≈2.0；>2.5 视为退化告警，不判失败） || [perf] done
restore-cases | exit=0 | 
```

`ast-json` 四步：重生成 → `git status --short typescript/cases` 空 → `diff` 0/0/0 → `git checkout -- typescript/cases`。

## 6. 风险

| id | 风险 | 现状 / 兜底 |
|---|---|---|
| R1 | 空语句仍未接管 | 默认关 = 逐位回到基线；`s4c2-empty*` 守 XML/AST；打开会丢节点（§2） |
| R2 | 标签接管的路由代码在仓库里但默认关 | 单开关 `EnableControlFlowLabel=false`；候选的 `ShellLabel` 分支在默认档永不命中（`Decide` 不会返回该值），行为等于 4c。打开前必须解决「推迟建壳」对表达式体状态机的影响（§3 读数） |
| R3 | `FinishShell` leftover 仍无通用重放 | s4c §7 风险 1 原样保留，是空语句 R1 与任何「壳吃掉下一格」类问题的共同根因 |
| R4 | 块内嵌套 / 函数体 / 声明族仍未覆盖 | 全部安全回退 legacy，`s4c2-fallback-*` 与 stage4/stage4b/dev 全绿 |

## 7. 文件

新增：
- `tests/statement-possible/s4c2-cases.json`

修改：
- `typescript/tokens/statements/statement-route-util.xl.md`（`ShellLabel` / `LabelShellCount` / 标签 lookahead（默认关）/ `EnableControlFlowEmpty=false` 的实测理由）
- `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（两条入口：控制流首格 / 标签 `:` 格；`Kind = route`；计数分流）
- `tests/statement-possible/control-flow-takeover.mjs`（20 → 33 条，含 `label` 计数与空语句回退读数）