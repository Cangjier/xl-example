# HANDOFF — Stage 4f：标签壳接管（文档级前瞻）

分支 `feature/possible-statement-s4f`，基线 `origin/feature/possible-statement` @ `60759526`。

## 1. 完成度

| 项 | 结果 |
|---|---|
| 1 标签壳接管，重开 EnableControlFlowLabel | **完成**：默认 `true`；首格判族、首格建壳；XML==legacy、AST==TS、label 计数增量有证据；op-ast-proof / op-proof 回到满值 |
| 2 函数 / 方法 / 构造器体语句目录 | **未做**（预算耗尽）：仍 legacy raw 递归，XML/AST 零差异，无接管计数 |
| 3 嵌套块深度 >= 2 与内层块体语句 | **未做**（保持 s4e 的深度 1 边界）：第 3 层起不建壳、内层块体 legacy，XML/AST 与 legacy 逐字节一致 |
| 4 声明族 / import-export | **未纳入**，保持 legacy（与 4c-2/4d/4e 同） |
| 5 专用 cases + 集成收敛 | 完成：control-flow-takeover 新增/改写 12 条标签读数，全表见 §4 |
| 6 安全回退 | 单开关：把 EnableControlFlowLabel 改回 `false`，前瞻分支整段不执行（它在 EnableControlFlowLabel 守卫内），行为逐位回到 60759526 |

**没有伪造绿**：第 2/3/4 项按优先级原样留在「未覆盖清单」，不建错树、不声称接管。

## 2. 标签修法（根因 + 两步）

**根因**（s4e §3 定位）：标签路由要在「语句首 ident」之后看到第二个代码单元（`:`）才能判；第二个代码单元
还没到时 DecideCommon 返回 None。于是表达式根候选在头格 Uncertain（不建壳），到下一格（`;` / EOF / ASI 边界）
走「不能补建」分支被 CatalogGuide **永久 Reject** —— 整条表达式语句拿不到壳，op-ast-proof 11/62。

**修法 A（判据，typescript/tokens/statements/statement-route-util.xl.md）**：`None` 窗口改成**文档级前瞻**
`StatementRouteUtil.IsLabelColonAhead(units, headAt)`：只看 `SourceRange.Document` 的源码字符，从 head 的
`EndIndex` 起跳过空白（含换行，`en` 换行 `: a;` 是合法标签）与两种注释（`//` 到行尾、`/* */`），
第一个其余字符是不是 `:`。**只读、零分配、不建状态**。判出结果后那一格直接给族：

- `:` → `ShellLabel`（标签）；
- 否则 → `ShellPlainExpression`（与标签关闭时的判据**逐位一致**）。

这样头格永远可判，表达式壳不再被推迟一格，11/62 与 8/40 的根因消失。

**修法 B（建壳时机，control-flow-statement-possible-shape.xl.md）**：标签分支改成**首格即可 Accept**
（`tokenIndex === headAt`），先搬 `ident` 进壳，`:` 与标签体作为后续普通单元喂入壳；`:` 那一格仍保留
Accept 作为兼容通道（旧路径/延迟到达）。判界仍走 `ScanRoot`、建树仍走 `StatementBuilder.BuildStatement`
的标签分派——同一份 scanner、同一份建造器，没有第二份判据。

**守卫**：`Reject` 仍留给真正的 `Legacy`；标签体 `{ ... }` 不分流（块候选在标签壳里看不到它，由建造器
原子递归）；`let:` / `if:` 这类双角色与关键字起点仍判 `Legacy`，行为不变。

## 3. 接管证据

control-flow-takeover 的 12 条标签样例从 `label=0` 改写为实测增量，覆盖：
`en: a;`、`lab: { f(); }`、`en:` 换行 `{ f() }`、`outer: while (a) { break outer; }`、`l1: f();` 换行 `l2: g();`
（label=2）、`en: ;`、嵌套标签 `l1: l2: f();`（只有外层建壳 label=1）、`en: { a; b; }`、`en: while (a) b;`、
块内标签 `{ en: a; g(); }`、`en: a;` 换行 `b;`、注释隔开 `en /* c */ : a;`。
反例守点：`a ? b : c;` 仍 `label=0`（前瞻看到 `?`）。每条都断言 XML==legacy、AST==TS、确定性、无
StatementShape/PossibleShape/CatalogGuide 泄漏、无文件级 fallback。

## 5. 未覆盖清单（全部安全回退 legacy）

| 构造 | 现状 | 下一步 |
|---|---|---|
| 函数 / 方法 / 构造器 / 箭头体 | 各自 legacy 递归，XML/AST 零差异，无计数 | 新建「语句体目录」挂到函数体 `{`（复用 OnBracketCreatedEvent + CollectBodyStatements），参考 BodyGuideUtil / BlockPossibleShape |
| 嵌套块第 3 层及更深内层 | 只建到深度 1（内层块壳）；更深层 legacy | 字符按「宿主括号 → 块壳 → 内层括号」两级 MountedUnit 路由没通；需要让块壳把字符继续转发给内层括号的 CatalogGuide |
| 嵌套块内层块体语句 | 内层块体 legacy raw 递归（body 计数 0） | 同上，先解决二级路由 |
| 声明族 / import-export | 完全 legacy | 与各 *-end-possible-shape 对账后再并入 |
| `else`/`catch`/`finally`/`case`/`default` 作语句首 | legacy | 非法输入，不接管 |
| `let:` 当标签 | `DecideCommon` 的 let/const/var 分支先返回 Legacy | 若需要，先在绑定判定前加同一条前瞻 |

## 6. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | 文档前瞻只读源码字符，注释/空白跳过有遗漏形态（如未闭合块注释） | 未闭合注释一律返回 false（判表达式），不判错树 |
| R2 | 前瞻只在「第二代码单元未到」窗口生效，第二单元已到时仍走 token 判据 | 两条判据同源（都是看下一个非 trivia 单元/字符是否 `:`），不会互相矛盾 |
| R3 | 标签壳在首格建、`:` 后到，若壳的终结候选在 `:` 那一格误判收口 | 12 条标签样例 + 全表 ast-json 6167 守；收口错误会立刻 AST/XML 不齐 |
| R4 | 函数体 / 深层嵌套块仍未覆盖 | 全部 legacy，XML/AST 与 legacy 零差异；单开关可回退标签 |

## 7. 文件

修改：
- typescript/tokens/statements/statement-route-util.xl.md（IsLabelColonAhead 新增；DecideCommon 的 None 窗口改前瞻；EnableControlFlowLabel 默认 true + 历史说明）
- typescript/tokens/statements/control-flow-statement-possible-shape.xl.md（标签首格建壳 + 兼容通道 + 文档）
- tests/statement-possible/control-flow-takeover.mjs（12 条标签读数；默认开关断言加 EnableControlFlowLabel）
- HANDOFF-s4f.md（本文件）
## 4. 全表读数（本次实测，命令见 tests/ 与 typescript/cases）

```
tsc                 (exit=0)
control-flow-takeover [control-flow-takeover] cases=39 failed=0 defaultFlag=true  (exit=0)
op-ast-proof      [op-ast-proof] group=ast-from-shapes cases=62 pass=62 fail=0 | 形状树接管计数已核 62 条、TS 逐节点已核 62 条、AST 数字叶子已核 8 条  (exit=0)
op-proof          [op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条  (exit=0)
block-body        [block-body-takeover] cases=21 failed=0 defaultFlag=true  (exit=0)
harness --all     [statement-possible] file-fallback total=0 distinct=0  (exit=0)
double-accept     [statement-possible] double-accept: cases=120 failed=0  (exit=0)
lint              [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）  (exit=0)
validate          1720 条用例，0 条不合格  (exit=0)
ast-json          total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）  (exit=0)
ast-json status   0 行（脚本实测 line-count=0）
ast-json-diff     合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条  (exit=0)
token-ast         non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)  (exit=0)
real-dts          真实 .d.ts 全量解析成功且 AST 逐节点一致  (exit=0)
stage4c2          [statement-possible] file-fallback total=0 distinct=0  (exit=0)
dev               fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;"  (exit=0)
comma-import      [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管）  (exit=0)
perf              [perf] done  (exit=0)
```

xl_build 887 written / 0 error（2510 warning，与基线同量级）。
