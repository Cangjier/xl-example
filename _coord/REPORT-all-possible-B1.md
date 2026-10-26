# REPORT-all-possible-B1 — 控制流 / 块 / 标签语句族增量形状

## 0. 身份与环境

- WP：**B1**（task-9）。分支 `feat/b1`，基线 `base-e0a` = **d03bfa82**，并已 merge **base-b2**（`feat/b2-expression-stmt` d1b9e7c7）。
- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\b1-control-flow`（node_modules 为 junction）。**未 push**。
- 本 WP 自己的文件：
  - 新增 `typescript/tokens/statements/statement-shell-catalog.xl.md`
  - 修改 `typescript/tokens/statements/control-flow-statement-possible-shape.xl.md`（新增 1 个路由段，锚点 `// [XL-ROUTE:control-flow]`）
  - 修改 `typescript/tokens/statements/block-possible-shape.xl.md`（锚点 `// [XL-ROUTE:block]`）
  - 修改 `typescript/tokens/statements/statement-family-dispatch.xl.md`（锚点 `// [XL-ROUTE:family-take]`）
  - 迁移 case：`typescript/cases/tts/cases/atomic/statements/**` → `typescript/cases/tts-impl/cases/statements/**`（23 条）
    + `atomic/types` 2 条 → `tts-impl/cases/types`（见 §5）
  - 本报告；探针 `tmp/probe-b1.mjs`（gitignored）
- **未改** `statement-shape.xl.md` / `root-expression-statement-possible-shape.xl.md` / `statement-route-util.xl.md` / `direct-*` / `expression-catalog-factory` / `variable-declaration-shape`。

## 1. 验收读数（可复算）

| 检查 | 命令 | 读数 |
| --- | --- | --- |
| 构建 | `xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }` | **569 written / 0 error / 3 warning**（E1107 为基线既有）；merge B2 后增量构建 **2 written / 568 skipped / 0 error** |
| 类型 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| tts 账本（迁移前） | `node typescript/cases/tts/run.mjs --quiet --json tmp/b1-merged.json` | 319 条：**PASS 294 / FAIL 25**，25 条全部 `atomic→incremental`（无 invalid / divergent / throw） |
| tts 账本（迁移后） | `node typescript/cases/tts/run.mjs --quiet --json tmp/tts-b1.json` | **total 294 / FAIL 0 / exit 0**，counts `throw 125 / atomic 116 / partial 53 / incremental 0`（= 380 − B2 迁走 61 − 本 WP 迁走 25） |
| tts-impl | `node typescript/cases/tts-impl/run.mjs --quiet --json tmp/impl-b1.json` | **PASS 131 / FAIL 0 / exit 0**（= B2 的 106 + 本 WP 25） |
| 单条证据 | `node typescript/cases/tts-impl/run.mjs --show statements/if-no-block`（等） | 每条 `expected=incremental actual=incremental pass=true`（§4 列表） |

**EOF 一致性**：迁移前 25 条全部是被 `run.mjs` 判为 `NOW-SUPPORTED` 的 `atomic→incremental`（`classify` 只有在
两种模式 EOF `shapeLines` 完全一致、且非骨架节点首次出现严格更早时才会给 `incremental`）；
没有任何一条落到 `divergent`。迁移后 tts 剩余 294 条逐条 PASS（非目标分类零漂移）。

## 2. 机制（最小可行：早挂外层壳 + 收口搬 legacy 子树）

账本只要求「非骨架 shape 节点严格更早 + EOF 树 `(类名,pos,文本字段)` 逐节点一致」。B1 用
`StatementShellCatalog` 把这件事压缩成「一个占位节点 + 一次搬树」：

1. **挂壳那一格**（`ControlFlowStatementPossibleShape.BuildByIndex` / `BlockPossibleShape.BuildByIndex` 末尾）：
   壳（`StatementShape`）刚建好、首代码字符已知，就在 `shell.Data[0]` 插入一个**占位节点**：
   - 类名 = 该族 legacy 最终节点的类名（`IfStatementShape` / `WhileStatementShape` / `BlockShape` /
     `ForStatementShape` / `ForInStatementShape` / `ForOfStatementShape` / `SwitchStatementShape` /
     `TryStatementShape` / `WithStatementShape` / `ThrowStatementShape` / `DebuggerStatementShape` /
     `LabeledStatementShape`）；
   - `Pos` = 壳的 `Pos`（与 legacy 逐位相同）；`src.Start` = 首代码字符；
   - **`IsTriviaToken = true`**：`ToAstLine` 照常打印（账本看得到），但 `StatementBuilder.Load`
     （`UnitToken` 的 trivia 过滤）、`ItemUtil`、`StatementEndPossibleShape` 的 `state.Code` 全部跳过它 ——
     解析状态机零扰动。
2. **收口**：`StatementFamilyDispatch.Build`（所有族建树的唯一漏斗）拿到 legacy 建出的节点后调
   `StatementShellCatalog.Take(built)`：按 `constructor.name` 匹配占位节点，把 `built.Data` 原样搬进占位节点、
   按 C1 覆盖 `src`（终点 = legacy 子树终点，不吸尾随 trivia），把 `IsTriviaToken` 恢复为 `false` 并返回它。
   `StatementShape.FinishShell` 于是用占位节点替换壳 —— **EOF 树 = legacy 树**（同类名 / 同 pos / 同子节点）。
3. `for` 的最终类名要到头里第一个单元才分得出来（classic / in / of）：head 那一格**三个候选都挂**，
   收口时只搬匹配类名的那一个，其余随 `consumed` 切片一起离开壳。
4. **门控**：两个挂壳点都 `if (StatementRouteUtil.IsIncrementalShapesEnabled())`；`Take` 同判。
   开关 `false` 时本目录一行都不执行，legacy 逐字节不变（tts LEGACY 模式即开关全关，294 条全 PASS 即证）。
5. **为什么占位节点必须插在 `Data[0]` 而不是末尾**：壳在收口前会把「最后一个子单元」当未关闭兄弟
   `TryToClose`（`WrapSymbol` / basic token 常规路径），`src.End` 未签的占位节点会被误关并抛
   `SourceRange is not set`（实测踩过）。放最前则 `Last()` 恒是真正的代码单元。

## 3. 已完成族 / 迁移清单（25 条，全部 `--show` = incremental）

23 条 `atomic/statements` → `tts-impl/cases/statements/`：
`block-empty, break, break-label, continue, debugger, empty-statement, for-classic, for-empty-clauses,
for-head-let-atomic, for-in, for-of, for-of-const, if-else-if-chain, if-no-block, label-block, label-nested,
stmt-object-vs-block, stmt-with, switch-case-let-atomic, switch-fallthrough, switch-single-case, throw-new,
while-no-block`

2 条 `atomic/types` → `tts-impl/cases/types/`：`catch-clause-annotation, for-init-annotation`
（根是 `try` / `for` 语句，被本机制连带解锁；不在原定 statements 写域，已在报告与 commit message 注明）。

## 4. 已被 B2 连带解锁 / 不重复迁移（14 条）

原 task-9 清单中以下 14 条在 merge `base-b2` 之后已在 `tts-impl`（B2 迁移），本 WP **跳过、不重复迁移**：
`asi-newline, asi-postfix-newline, asi-return-newline, asi-same-line, block-statements, do-while,
foreach-call, if-else-block, stmt-array-literal-start, stmt-object-literal-paren, try-catch,
try-catch-nobind, try-finally, while-block`。

## 5. 未完成 / 续任交接（4 条）

| case | 根因 | 下一步 |
| --- | --- | --- |
| `atomic/statements/return-no-value`、`return-value` | 文件根是 **函数声明**（route `ShellFunctionDeclaration`），本 WP 的挂壳点只覆盖控制流/块/标签；`return` 本身在函数体内，若给 `return` 挂占位节点会连带把 5 条非目标 atomic/declarations 判成 incremental（`class-getter`、`function-return-type`、`function-generic-export-default`、`function-param-return`、`function-predicate`，它们体内都有 `return`）——违反「非目标零漂移」，故**刻意不挂** | **B3**（函数/类声明族）给 `ShellFunctionDeclaration` 壳加早期 `FunctionDeclarationShape` 占位节点（同一 `StatementShellCatalog` 可直接复用，加 `FunctionDeclarationShape`/`ClassDeclarationShape` 候选即可），这两条会随 B3 变 incremental |
| `atomic/statements/stmt-async-function` | 同上（route `ShellFunctionDeclaration`）；只按 `async function` 窄化会漂移 `atomic/declarations/function-async.ts`、`function-async-generator.ts` | 同 B3 |
| `atomic/statements/stmt-let-as-identifier`（`let = 1;`） | route = **`Legacy`**：走 `StatementPossibleShape` 的「收口时原子建树」，**根本没有壳**可挂；`let` 当标识符的形态不是控制流 | 需要给 `StatementPossibleShape` 的 Legacy 路由补「壳化」通道（与 B2 的 expression shell 同构），或由 B7 统一处理 |

## 6. 与 B2 的合并情况

- 本分支已 `git merge base-b2`（无冲突）。B2 对 `statement-shape.xl.md`（`[E-SHAPE:MOUNT]`、
  `StatementShape.Process` 覆写、`UnpackIncremental`）与 `root-expression-statement-possible-shape.xl.md`
  的改动作与 B1 的占位节点机制**兼容**：merge 后重跑，tts 294 / tts-impl 131 全绿，无 divergent。
- 交互点：B2 的 `Process` 覆写会经过壳的 `ComputePossibleShapes`；B1 占位节点是 trivia，被
  `StatementBuilder.Load` / 扫描器统一跳过，所以两者不抢 `Data` 里的代码单元。

## 7. 风险 / 注意

1. **占位节点必须保持在 `shell.Data` 的第 0 位且 `IsTriviaToken = true`**：以后谁改
   `StatementShape.Process` / `TryToClose` / 壳收口路径，必须保留「trivia 跳过」语义；把占位节点移到末尾
   会触发 `SourceRange is not set`（§2.5 已写）。
2. `StatementShellCatalog` 的 `Lists` 是进程级静态栈，靠「壳收口必经 `StatementFamilyDispatch.Build`」配对；
   若将来某族收口不走 dispatch（例如新增的 fallback 直接建树），会留下一条未弹出的占位列表（不会崩，
   但同进程后续同族语句可能误匹配）。B1 实测 294+131 条同进程连续解析无异常；建议 B7 在
   `SyntaxContext` 级解析开始时清空，或给匹配加 `Pos` 相等校验。
3. `empty-statement`（`;`）也被判 incremental（占位节点在 `;` 收口前出现）；它的 `consumed` 切片若只含
   首单元，占位节点会随壳的 leftover 处理，当前实测 EOF 树一致、无残留，但属于边界形态，值得 B6 复核。
4. 2 条 `atomic/types` 的迁移超出原定 statements 写域（见 §3），合并时若 B3/B4 也声称这两条，按
   「先到先得」保留本分支的迁移即可（内容不变，`git mv` 语义）。
5. 未跑任何既有 gates（纪律），未 push。

## 8. 复算命令

```powershell
xl_build { cwd: "...b1-control-flow", paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .
node typescript/cases/tts/run.mjs --quiet            # 期望 exit 0（294 条全 PASS）
node typescript/cases/tts-impl/run.mjs --quiet       # 期望 PASS 131 / FAIL 0
node tmp/probe-b1.mjs "if (a) { b; } else { c; }"    # 逐字符双模式树 + 分类
```
