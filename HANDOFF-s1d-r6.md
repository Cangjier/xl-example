# HANDOFF — T1d r6：EOF 尾段多语句兜底（13 条结构差 → 2），开关仍 false

分支 `feature/possible-statement-s1d`（本目录 r6），起点 `a35eefcc`（r5）。
本轮代码提交：`65bba7c1`（只改 1 个 `.xl.md`，未改 core/、未动开关）。

## 1. 本轮结论

r5 修掉「同一 `ExpressionStatementShape` 二次 SignOut」后，true 态剩下的 13 条结构差
**不是 4 个无关构造，而是同一个根因**：`SourceFileEndPossibleShape.BuildByIndex` 的 EOF 分支
把**一整段尾段**当成一条语句去建，而尾段里其实有 2 条语句：

```
#81  "lab: a\nc;"                          #82 "lbl: while (a) b\nc;"
#92  "lbl: return\nc;"                     #129 "l: x\ny();"
#57  "en:\n{ f() }\nenum E { A }"          #146 "export const x = a as T\n(b);\nexport const z = 1;"
#101 "const a = b as T\n(c); const d = e as U\n(f);"
#13 "let a = 1; a++; --\na;"  #14 "…b++; ++\nb;"  #16 "if (a) { a++; } --\na;"
```

硬证据（`SR.Parse` 直接跑最小用例，栈已过滤到 build/）：

```
#81 ExpressionStatementShape.FromUnits   (expression-statement-shape.js:52)
    SourceFileEndPossibleShape.BuildTrailingDeclaration (source-file-end-possible-shape.js:552)
    SourceFileEndPossibleShape.BuildByIndex              (…:225)   ← EOF 分支
#13 ExpressionBuilder.ParseUnary 抛「表达式意外结束」→ 同一条 BuildTrailingDeclaration 调用栈
```

即：`BuildTrailingDeclaration` 在「段首看起来像声明/表达式」时会把 `lab : a c` 或 `-- a`
整段交给 `FromUnits`，`ExpressionBuilder`/`ExpressionStatementShape` 吃不完 → 抛。
开关关掉时这套代码走不到（legacy 先收口），所以 false 态一直是 6167/6167。

## 2. 改了什么（1 文件、1 处，`typescript/tokens/files/source-file-end-possible-shape.xl.md`）

`BuildByIndex` 的 EOF 尾段分支改成三段式兜底，真正落地的建树逻辑一行没改：

1. `BuildTrailingDeclaration` 放进 `try`（它原来就会抛，直接冒到 `CatalogGuide`）；
2. 返回 false 或抛异常 → 调**已有的** `SourceFileEndPossibleShape.BuildStatementSegments(host, start, at, context)`
   （逐条 `StatementBuilder.BuildStatement` 建、按已建形状的 `SourceRange.EndIndex` 定下一段起点）。
   这正是「EOF 尾段有几句就建几句」的语义，且完全复用仓库既有实现，不新增判据；
3. 切段也建不出来（不是语句垃圾）→ 才走旧的单条 `ExpressionStatementShape.FromUnits` 兜底，
   行为与改前逐位一致。

## 3. 门读数

| 门 | false（最终提交 65bba7c1） | true（本轮修复后） | true（r5 基线） |
| --- | --- | --- | --- |
| tsc | 0 | 0 | 0 |
| validate | 1720/0 | 同（未单跑 true） | 1720/0 |
| ast-json | total cases=6167 cj-ok=6167 cj-fail=0 | **cj-ok=6165 cj-fail=2**（1 个构造：end-compute） | 6154/13 |
| ast-json-diff | 合计 6167：完全一致 6167；结构差 0 / 位置差 0 / 字段差 0 | **结构差 2 条**（end-compute，均为 `CRASH 语句没有读完`）/ 位置差 0 / 字段差 0 | 结构差 13 / 0 / 0 |
| token-ast | summary total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 | total=1716 **ok=1696 crash=10** diff=0 ts-invalid=10 | ok=1696 crash=10 |
| real-dts | 226/226（r5 已验，本轮未改动其路径） | 未重跑 | 226/226 |

true 态 13 → 2，且 6 条 `missing-end` / `possible-compute` 用例（#81/#82/#92/#101/#129/#146）
已随同一处修复消失（per-stem 读数受 `typescript/cases/*.cj-ast.json` 快照状态影响，
本轮末次 per-stem 跑在 `git checkout -- typescript/cases` 之后，不能作为独立证据）。

## 4. 剩余失败（精确根因）

**只剩 2 条，同一个新错误消息**：`CRASH 语句没有读完`（不再是我修的 `表达式语句没有读完` /
`表达式意外结束`）。最小用例：

- `en:\n{ f() }\nenum E { A }` → `line 3: enum E { A }` 处抛
- `const a = b as T\n(c); const d = e as U\n(f);` → `line 3: (f);` 处抛

语义：`BuildStatementSegments` 建出**首段**（`en:` 标签头 / 第一条 `const`）后，
`builder.BuildStatement()` 对剩余段返回 `null`（它内部 catch 了、返回 null），
循环 `break`，剩下的单元原样留在 `host.Data` 里；随后 legacy/根终结候选在 EOF
用 `StatementBuilder` 收口，遇到已经 splice 进来的形状 + 剩余 token 的混合体，
报「语句没有读完」。

下一步（2 选 1）：

1. `BuildStatementSegments` 的 `statement === null` 分支不要 `break`：改成把当前段再切一刀
   （用 `ExpressionStatementPossibleShape.IsAsiBoundary` 找本段第一个换行边界，
   只把 `cursor..boundary-1` 交给 `BuildStatement`；建不出再前移一个边界），
   这样 `--`（前缀、跨行）与 `as T` ⏎ `(` 都能落到「首段 + 次段」的正确切点；
2. 或者按 S1b 设计 §「显式本层已关闭信号」：FinishShell/DetachShell/父层 TryToClose 写旁表，
   EOF 收口时先看旁表再决定是否交给 legacy。

## 5. token-ast crash 10（未动）

true 态 `crash 10` 与 r5 逐位相同（r5 记为 14，本轮实测 10；均集中在 `BuildFromShell`
抛错后 `DetachShell` 兜底同源）。false 态 0 crash，所以与开关强相关，按 S1b F1 的
try/catch + DetachShell 兜底方案继续。

## 6. 开关最终值

`StatementRouteUtil.EnableShellExpressions = **false**`（未改）。true 态仍差 2 条结构差 + 10 crash，
**不要**在此时打开开关。

## 7. 复现手法（下一位直接用）

```powershell
# 1) 预载把开关置 true（build/ts 里的静态字段，运行期改，不用重编）
# _enable-true.cjs：require('…/statement-route-util.js') 里找到带 EnableShellExpressions 的类，置 true
node --require ./_enable-true.cjs typescript/cases/ast-json.mjs
node --require ./_enable-true.cjs typescript/cases/ast-json-diff.mjs
git checkout -- typescript/cases          # 生成物必须复原，不要提交
# 2) 最小用例直接跑（_diag7.cjs 模板）：SR = build/ts/typescript/run/source-file-runner.js 里的 SourceFileRunner
#    SR.Parse(src); 异常对象的 message 是 undefined，真文字在 e.Message（String(e) 会给出 {Message,…}）
```
