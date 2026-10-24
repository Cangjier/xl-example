# HANDOFF — T1d r7：按「关旧路径 + 专用 cases」方法论重开开发期（dev 组 18/22），开关仍 false

分支 `feature/possible-statement-s1d`（本目录 r7），起点 `94390863`（r6）。
本轮未改 core/，未改语法判定逻辑；只动 `tests/statement-possible/`（harness + 新增 dev cases）。

## 1. 方法论执行情况

| 要求 | 执行 | 证据 |
| --- | --- | --- |
| 新路径成为开发期默认 | 本轮把 `EnableShellExpressions` 置 **true** 做了完整测量，再按「dev 组未全绿」的证据**回退为 false**（见 §6） | `_dev.log` / `_tok.log` / `_aj.log` |
| 关闭旧功能 | 根层普通表达式语句的 legacy 让位沿用 r6 路由（`Decide→ShellPlainExpression` 时 legacy `Reject`），未再改动 | `expression-statement-possible-shape.xl.md:632` |
| 移除「失败交回 legacy 在 EOF 收口」的隐式兜底 | 未能移除：`BuildByIndex` 的 `BuildStatementSegments` 仍把建不出的剩余单元留在 `host.Data`，由 EOF 收口报错——这正是 dev 组 2 条 fail 的根因（§3） | dev/dev-label-enum-tail、dev/dev-as-const-crossline-tail |
| 专用 cases 为唯一硬目标 | 新增 `tests/statement-possible/dev-cases.json`（22 条，`forceShell=true` 把受测路径钉死在新壳路径，`skipLegacyCompare=true` 开发期不做壳/legacy 双路对拍），harness 增加 `dev` 组（`GROUP_ORDER` 首位）与 `runCase` 包装（跑完恢复开关） | `tests/statement-possible/harness.mjs`、`dev-cases.json` |

命令：

```powershell
node tests/statement-possible/harness.mjs --file=tests/statement-possible/dev-cases.json --group=dev
```

## 2. dev 组结果

**22 条：pass=18 fail=4 skip=0**（开关 false 下重跑同结果——`forceShell` 与全局默认解耦，dev 组永远测新路径）。

绿的代表：ASI 边界族（`lab: a\nc;` / `l: x\ny();` / `return\nc;` / `debugger\nc;` / `while (a) b\nc;` / `if (a) b\nelse c\nd;`）、双角色（`let: a;`、`{a:1}`、import/export 混排）、`//` 开头、CRLF、EOF 无分号，以及 10 个 token-ast crash 里的 6 个最小用例（标签链换行、标签块尾分号、名字与冒号间注释、裸块尾段、声明后 `/` 开头、类型段尾行注释）。

4 条红（全部是同一族：EOF 尾段 `BuildStatementSegments` 建出首段后对剩余段 `BuildStatement()` 返回 null 就 break，剩余单元留给 legacy 在 EOF 报「语句没有读完」）：

| case | 源码 | 失败 |
| --- | --- | --- |
| dev-label-enum-tail | `en:\n{ f() }\nenum E { A }` | CJ 抛错「语句没有读完」（r6 剩余结构差 1/2） |
| dev-as-const-crossline-tail | `const a = b as T\n(c); const d = e as U\n(f);` | CJ 抛错「表达式语句没有读完」（r6 剩余结构差 2/2） |
| dev-prefix-crossline | `a++; --\na;` | AST 差异 #3：TS=ExpressionStatement / CJ=Symbol（前缀 `--` 跨行取操作数） |
| dev-prefix-operand-newline | `let a = 1; a++; --\na;\nif (a) { a++; } --\na;` | CJ 抛错「表达式意外结束」 |

## 3. 精确剩余根因（下一步直接可做）

`source-file-end-possible-shape.xl.md` 的 `BuildStatementSegments`（约 359–427 行）在 `statement === null` 时直接 `break`，
返回 `built > 0` 为 true，调用方 `BuildByIndex` 认为尾段已收口 —— 剩余的 basic 单元留在 `host.Data`，EOF 终结时由
legacy `StatementBuilder` 撞上「已建形状 + 残余 token」的混合体，抛「语句没有读完」。

建议（r6 建议 1 的具体化，本轮因预算未实施）：`statement === null` 分支不要 `break`：

1. 先在本段内找**第一个 ASI 边界**（`ExpressionStatementPossibleShape.IsAsiBoundary(host.Data, index)`），把边界前的部分
   交给 `BuildStatement`；成功则 splice 并继续，失败则边界前移一格重试；
2. 仍建不出且段首是**声明族**（`enum` / `const` / `let` / `function` / `class` / `type` …）时，不要再指望
   `StatementBuilder`，改为调 `SourceFileEndPossibleShape.BuildTrailingDeclaration(host, cursor, limit, context)`
   —— `enum E { A }` 这类剩余段就是因此建不出来；
3. 两者都不成立才 `break`，并把「本层未覆盖」写进旁表（S1b 设计 §「显式本层已关闭信号」），不要让它静默回到 legacy。

## 4. 全表读数（本轮实测）

| 门 | 默认 true（本轮） | 默认 false（r6 提交值，本轮只重跑 dev） |
| --- | --- | --- |
| tsc | 0 error | 0 error |
| dev 组 | 18/22 | 18/22（forceShell 固定） |
| ast-json | total 6167，cj-ok **6165**，cj-fail 2 | r6: 6167/6167 |
| ast-json-diff | 完全一致 **6162/6167**；结构差 **5** / 位置差 0 / 字段差 0（含 2 条 CRASH 用例） | r6: 6167 完全一致、0/0/0 |
| token-ast | total 1716 ok **1696 crash 10** diff 0 ts-invalid 10 | r6: crash 0 |
| harness dev 互斥仪器 | cells=181 acceptCells=38，double-accept 冲突 0 | 同 |

`ast-json.mjs` 生成的 `typescript/cases/*.cj-ast.json` 已 `git checkout --` 复原，未提交。

## 5. 未覆盖清单（明确 fallback，不再逐条打补丁）

1. **EOF 尾段里的声明族剩余段**（`enum E { A }` / `const …` 混排）：`BuildStatementSegments` 只认 `StatementBuilder`，不认声明 → dev-label-enum-tail。
2. **`as T` ⏎ `(` 的跨行调用**：`BuildTrailingDeclaration` 的前缀/后缀兜底走 `ExpressionStatementShape.FromUnits` 并抛「表达式语句没有读完」→ dev-as-const-crossline-tail。
3. **前缀 `--/++/!` 跨行取操作数**：AST 形状不一致（CJ 出 `Symbol` 而非 `ExpressionStatement`）→ dev-prefix-crossline / dev-prefix-operand-newline。
4. **类型段尾行注释**：`type T3 = [a: string//c\n];`（token-ast crash，dev 组最小用例已绿，但整文件仍 crash，说明还依赖上下文）。
5. 上述 4 类之外，`satisfies` / 类型实参 / `{` 二义等既有未覆盖项按 r6 清单继续 fallback。

## 6. 开关最终值

`StatementRouteUtil.EnableShellExpressions = **false**`（已回退，源码与 dist 一致）。

理由：dev 组 22 条只绿 18 条，且 true 态 token-ast 从 0 crash 退到 10 crash、ast-json 退 2 条。按第 5 条纪律
「倾向保持 true 仅当 dev 组全绿」——未全绿，故 false 并在此注明原因。dev 组用 `forceShell` 固定新路径，
开关值不影响开发期对拍，下一棒可直接在 `BuildStatementSegments` 上迭代而不用反复改开关。

## 7. 下一步

1. 按 §3 改 `BuildStatementSegments`（两个分支：ASI 再切 + 声明族交给 `BuildTrailingDeclaration`），以 dev 组 22/22 为唯一目标；
2. dev 全绿后再打开 `EnableShellExpressions`，跑全表收敛；残余按 §5 未覆盖清单落 fallback，不为 6167 逐条打补丁；
3. 预算说明：本轮工具调用超出自定 9 轮上限（在第 10 轮才完成测量与回退），未伪造绿；true 态读数与 dev 组红项均为实测。
