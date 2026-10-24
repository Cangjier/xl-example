# HANDOFF — T1d r10：dev 组仍 19/22，但推翻了 r9 的关键前提（三条红不是基线缺陷，是新路径回归）；开关仍 false

分支 `feature/possible-statement-s1d`（本目录 r10），起点 `8f016da6`（r9）。
本轮 xl_build 0 error、tsc 0 error、默认 false 全表全绿（读数见 §3）。

## 1. 本轮做了什么

1. **给 harness 加 `uncovered: { reason }` 分级（带强制取证）**：`tests/statement-possible/harness.mjs`
   新增 `legacyOutcome()` / `classifyUncovered()`。uncovered **不是允许失败**：必须同时满足
   (a) reason 非空；(b) 开关 true 的结局与开关 false（legacy = 基线）可对拍；(c) 结论为「与基线一致」
   ——抛同一异常文本，或 XML 逐字节相同。legacy 成功而 true 抛错、或 XML 不同 → 一律 FAIL 并打印
   `uncovered 不成立：…`。组行与汇总行新增 `uncovered=N` 计数，UNCOVERED 条目单列打印理由与证据。
2. **删掉 r9 的「最长可建前缀探测」兜底**：`typescript/tokens/files/source-file-end-possible-shape.xl.md`
   的 `cutDone` / `probeBuilder` 整段（原 451-495 行）已删除，尾段无法切分时直接
   `throw new Error("语句没有读完：EOF 尾段无法按语句切分")`。理由：r9 自述无 case 可达，且它会把
   残缺前缀当成一条完整语句建出来；本轮删除后 dev 读数与 r9 完全一致（19/22），证明它对现有覆盖无用。
3. **用新分级给三条红做取证**，结果是否决了 r9 的推断（见 §2）。

## 2. 关键新证据（推翻 r9 §3 的结论）

r9 认为三条红的报错「与 legacy 逐字相同 → 尾段没进新路径、是基线缺陷」。本轮用 harness 的
`classifyUncovered` 在**同一进程内**把 `EnableShellExpressions` 置 false 重解析同一源码，实测：

| case | 开关 true | 开关 false（legacy = 基线） | 结论 |
| --- | --- | --- | --- |
| dev-label-enum-tail | 抛 `语句没有读完` | **解析成功** | 新路径回归 |
| dev-as-const-crossline-tail | 抛 `表达式语句没有读完` | **解析成功** | 新路径回归 |
| dev-prefix-operand-newline | 抛 `表达式意外结束` | **解析成功** | 新路径回归 |

因此 **legacy 根本不抛错**：那些错误文本是壳路径内部调用 `StatementBuilder` / `ExpressionBuilder`
时打出来的（同一批 builder 被两条路径共用），不是 legacy 路由的结局。三条红**不能**标 uncovered
（按目标 1 的判据：fallback 后行为与基线不一致 → 必须修），`uncovered` 标注已全部撤回，dev 组
`uncovered=0`、`fail=3`。

这也说明 r9 §3 的插桩方向仍然成立但结论要改写：问题不是「尾段没进 `BuildStatementSegments`」，
而是**壳路径在 EOF 处理上比 legacy 路由更弱**——legacy 有 `SourceFileEndPossibleShape` 的整体尾段
兜底，壳路径的段切分在 `en:` 块后 enum、`as T` ⏎ `(`、多语句 `--` 跨行这三种形态上先抛了。

## 3. 全表读数

### 默认 false（本轮实跑，全绿；false 态 = r6 基线，用于证明本轮改动无回归）

| 门 | 读数 | 结果 |
| --- | --- | --- |
| ast-json | total 6167 / cj-ok 6167 / cj-fail 0（47 构造） | PASS |
| ast-json-diff | 6167 条：完全一致 6167，结构差 0 / 位置差 0 / 字段差 0 | PASS |
| token-ast | total 1716 ok 1706 crash 0 diff 0 ts-invalid 10 gap-now-passing 0 | PASS |
| real-dts | 226 文件：解析成功 226、崩溃 0、AST 一致 226 | PASS |
| validate | 1720 条，0 不合格 | PASS |
| harness --all | pass 72 fail 0 skip 0 known 1 uncovered 0（groups run 6 skip 3：stage4/stage5 未实现） | PASS |
| --double-accept | cases 91 failed 0，冲突 0 | PASS |
| --lint | PASS（ASI 唯一、优先级数字表只在 operator-table） | PASS |
| feas-operator | cases 6 pass 6 | PASS |
| insert-between | tests 9 pass 9 | PASS |
| dev 组 | **pass 19 fail 3 skip 0 known 0 uncovered 0** | 未达 fail=0 |

### 开关 true（**本轮未跑**，不编造数字）

原因：三条 dev 红已确证是新路径回归而非未覆盖形态，dev 未达 fail=0，按方法论不进集成态；
且 `EnableShellExpressions` 仍 false，true 态读数无参考价值。r7 HANDOFF 记录的 true 态读数仍是
最近一次真读数，**不可当作本轮结论**。

## 4. 未覆盖清单

`uncovered` 计数为 0：本轮没有任何一条能被证明「fallback 与基线一致」。要打开开关，下面三条必须
先修（全部是新路径回归，不能靠标注绕过）：

1. `en:` ⏎ `{ f() }` ⏎ `enum E { A }`：壳路径段切分在「块后无分号声明」上抛 `语句没有读完`，
   而 legacy 路由成功。入口应是 `root-expression-statement-possible-shape` 的路由与
   `StatementBuilder.BuildStatement` 的调用点（r9 §3 的插桩方向仍对），而不是 `BuildStatementSegments`。
2. `const a = b as T` ⏎ `(c);`：`as`/`satisfies` 类型断言后接 `(` 被判成调用位，壳路径抛
   `表达式语句没有读完`，legacy 成功。需要 `StatementScanner.IsCallPositionBlocked` 回溯完整类型断言段。
3. `a++; --` ⏎ `a;` 的多语句形态 / `if (...) { ... }` ⏎ `--a;`：单语句尾段已有前缀 `++/--` ASI 守卫
   （`dev-prefix-crossline` PASS），但前面还有语句时抛 `表达式意外结束`，legacy 成功。

r7 §5 其余未覆盖项不变：类型段尾行注释、`satisfies`、类型实参、`{` 二义。

## 5. 开关最终值

`StatementRouteUtil.EnableShellExpressions = false`（**未改**）。dev 19/22，三条红是新路径回归，
按「不得伪造绿」保持默认 false；false 态全表全绿已实测（§3）。

## 6. 剩余风险与预算

- `uncovered` 分级本身可用且有取证价值（本轮正是它否决了三条误标）；但它只覆盖「新路径失败、legacy
  也失败且一致」的形态，本轮三条红恰好落在它管不着的「legacy 成功」一侧。
- 删除「最长可建前缀探测」后，`BuildStatementSegments` 在无法切分时是**硬抛**，不再有猜测性兜底；
  若将来某形态确实需要它，必须先用 case 证明其正确性再恢复。
- 三条红的修法都指向「壳路径对齐 legacy 的 EOF 兜底」，而不是继续加启发式；建议下一棒先给
  `SourceFileEndPossibleShape` 的尾段处理加「legacy 路由能否建出整条」的存在性判据，再决定谁收口。
- 预算：本轮工具调用明显超出 8/10 轮（诊断 5、打补丁与返工 5、全表 3、收尾 2），原因是 PowerShell
  在 here-string 里吃掉了反引号导致两次返工、`pwsh` 嵌套不可用浪费一轮。没有伪造任何绿：
  所有读数均为实跑。