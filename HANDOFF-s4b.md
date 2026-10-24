# HANDOFF — s4b（Stage 4b：块体语句收集通道 + 块体括号接管 + 专用 cases）

STATUS: **PARTIAL / 全表绿**。默认开关下块体仍由 legacy `BuildBlock` 原子递归；接管通道（`CollectBodyStatements`
+ 块体目录 + 建壳时机）已实现并可在 `EnableBlockBodyCatalog=true` 下运行（实测计数见 §4），但打开会让
块内第一条语句的 `pos` 与 TS 差一格，因此**默认仍关**，不伪造接管。§6 是剩余两项。
BRANCH: feature/possible-statement-s4b
BASE: c616c7fe（feature/possible-statement）

## 1. 完成度一句话

块体语句的「收集」通道落地（`StatementBuilder.CollectBodyStatements`，对齐
`BodyGuideUtil.CollectBodyMembers` 的两条路）；块体目录不再只能等 `}` 关闭才挂（`SourceFileShape.OnBracketCreatedEvent`
在 `{` 建出来时给根目录补一格）；块壳接管块体括号（`shell.MountedUnit = bodyBracket`）。打开开关时块内
`let` / 表达式语句由 possible 增量建、按序收集（`{ let x = 1; f(); }` → 2 条、`{ f(); g(); }` → 2 条、
`{ a; b; c; }` → 3 条、`{ a; }\n{ b; }` → 2 个块壳），默认关；两种缺口（R1 / 第二块）均有实测结论。

## 2. CollectBodyStatements 设计（`statement-builder.xl.md`）

`BuildBlock()` 先看 `StatementBuilder.HasBuiltBodyStatements(bracket)`：

- **没有已建语句形状** → 原有路径（`inner.Load(bracket.Data, base)` + 循环 `BuildStatement()`），与基线逐字相同；
- **有** → `this.CollectBodyStatements(bracket, shape)`：
  1. 括号 `Data` 里已由块体目录建成的语句形状：**按序原样收集**（`shape.Add`，设 `Parent`），不再重建；
  2. 形状之间的 raw 段：切出来交给内层 `StatementBuilder.Load(段, base)` + `BuildStatement()` 逐条建，
     `base` 口径与 `BuildBlock` 相同（首段 `{`.StartIndex+1；之后每段取前一个兄弟的 `SourceRange.EndIndex`）；
  3. 尾段同样处理；
  4. `base` 对照：第一条收集语句的 `Pos` 若小于 `{`+1，按块口径纠正（`(unit as ShapeToken).Pos = rawBase`）；
     这条修正**已落地但不彻底**（见 §6 D1：AST range 仍差一格，说明 `pos` 不只由 `Pos` 字段决定）。
  5. **安全回退**：`StatementShape` 壳残留或 raw 语句把已建形状当子语句（如 `if (a) f();` 的 `f();` 已被建）时
     直接抛错，由 `SourceFileRunner.Parse` 的文件级 fallback 整条重解析（AST 与 legacy 一致）。

计数器：`StatementRouteUtil.BlockBodyStatementCount`（只增不减）在「收集一条已建语句」时 +1，
与 `BlockShellCount` 一起把「块壳化」与「块内接管」分开计量。

## 3. 块体钩子（改了哪 5 个文件）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/block-possible-shape.xl.md` | ① `shell.MountedUnit = bodyBracket`（块壳接管刚建出的 `{` 括号，后续字符才进块体）；② 目录改成 `new CatalogGuide(shapes, new BlockBodyWaitingPossibleShape())`；③ 新增 `BlockBodyWaitingPossibleShape`（永远 Uncertain 的占位终结候选，避免「候选全被拒 + 无终结候选」抛错把整条文件逼进 fallback） |
| `typescript/tokens/files/source-file-shape.xl.md` | 新增 `OnBracketCreatedEvent`：`{` 建出来时给根目录补一格（**只在 `EnableBlockBodyCatalog=true` 时生效**，默认逐位不变），块壳「在 `{` 就建」、块体目录随即挂上 |
| `typescript/tokens/statements/statement-builder.xl.md` | `BuildBlock` 分派；`HasBuiltBodyStatements` / `CollectBodyStatements` |
| `typescript/tokens/statements/statement-shape.xl.md` | `FinishShell(shell, built, context)`（第三参数留给后续尾巴重放，当前不读）；无其它行为改动 |
| `typescript/tokens/statements/statement-route-util.xl.md` | `EnableBlockBodyCatalog` 默认仍 **false**（理由见 §6）；新增 `BlockBodyStatementCount` / `LeftoverReplayCount` / `LeftoverReplayFailed` |

## 4. 块内接管证据（同一进程直连 `build/ts`，两档开关实测）

`scripts` 见 §9；每条的 `shells` = `BlockShellCount`，`body` = `BlockBodyStatementCount`，`fallback` = `FileFallbackCount`。

| 源码 | 默认（flag=false） | flag=true（接管路径） |
|---|---|---|
| `{ let x = 1; f(); }` | shells 1 / body 0 / fallback 0 | shells 1 / **body 2** / fallback 0 |
| `{ f(); g(); }` | 1 / 0 / 0 | 1 / **2** / 0 |
| `{ { a; } }` | 1 / 0 / 0 | 1 / 0 / 0（内层块未接管，legacy 递归，AST 正确） |
| `{ let a = 1\nlet b = 2\nf() }` | 1 / 0 / 0 | 2 / **4** / 0（AST `pos` 仍差，见 D1） |
| `{ a; }\n{ b; }` | 1 / 0 / 0 | **2** / 1 / **1**（双壳成功；块 2 走一次文件级 fallback） |
| `{ let a = 1; f(); b; }` | 1 / 0 / 0 | 1 / **3** / 0 |
| `{ if (a) b; }` | 1 / 0 / 0 | 1 / 0 / 0（控制流未覆盖 → raw 段 legacy，AST 正确） |
| `{ ; }` | 1 / 0 / 0 | 1 / 0 / 0（空语句 raw，AST 正确） |
| `{ a; b; c; }` | 1 / 0 / 0 | 1 / **3** / 0 |

结论：接管通道**真的会接管**（body>0 只在 flag=true 出现），但默认关；默认档 stage4b 9/9 是「legacy 正确」，
不是「接管」。

## 5. 两缺口结论

### 5.1 同文件第二块不建壳（HANDOFF-s4block §6.2）

- 默认档：`{ a; }\n{ b; }` shells=**1/2**（第二块由 EOF 的 legacy 尾建，AST/XML 正确）。
- flag=true：shells=**2/2**（`BlockShellCount` 实测，块 2 也有自己的壳），fallback=1（块 2 的壳走了一次整文件重解析）。
- 机制：根目录在 `{` 新建时**没有判定格**（只有 basic token 关闭才问父单元），块壳只能等 `}`；第二块的 `{`
  于是被还挂着的第一个壳吞掉。`SourceFileShape.OnBracketCreatedEvent`（flag 门控）就是补这一格。

### 5.2 R1 `let a = 1` ⏎ `{ b; }`（VERIFY-REPORT-s4-s3g R1）

**实测：这不是新路径的独占缺陷 —— legacy 解析同一源码也抛 `表达式语句没有读完`。**

```
R1 shell=true  err="表达式语句没有读完" fallback=1   （整文件 fallback 触发，但 fallback 重解析同样抛）
R1 shell=false err="表达式语句没有读完" fallback=0
```

所以「至少文件级 fallback 兜底」**做不到**：兜底走的就是 legacy，legacy 自己建不出来。原因在
`StatementBuilder` 的表达式语句/变量语句建树器（`let a = 1` 之后紧跟 `{` 的 ASI 边界），不在壳路径。
本文档 §6 D2 给出下一手；该源码形**不进 `stage4b` 的绿色用例集**（不把已知失败算成通过），
但已记录在此并在验证时复现。

## 6. 默认开关仍为 false 的两条硬理由（实测）

| id | 缺陷 | 证据 | 下一手 |
|---|---|---|---|
| D1 | 块内第一条语句 `pos` 差一格 | flag=true：`{ a; }` 的 `Identifier/PropertyAccess/CallExpression` range TS=[1,4) vs CJ=[0,4)；`VariableDeclarationList` TS=[1,11) vs CJ=[0,11)；`Pos` 修正已加但不生效 | 在**建壳**处按块口径定 `Pos`（`StepByIndex` 读的是 `{` 括号的 `Start+1`），而不是收口后补；对照 `BuildBlock` 的 `base` |
| D2 | 块内最后一条无分号语句在 `}` 前收口 | flag=true：`{ let a = 1\nlet b = 2\nf() }` shells=2 / body=4，但 AST 有差异 | 见 §5.2：`StatementShape` 需要「看到结束括号先按 ASI 收口」的通道（`ExitOrPre` 或括号事件的 Reload 重放）；实现过一版（`ExitOrPre` + `Reload`），因会改变根级 shell 行为、且 `IsAsiBoundary(this.Data, last)` 在壳内返回 false（`WrapSymbol` 空白单元在 `Data` 里），已撤回，未留半成品 |

## 7. 专用 cases

- 新文件 `tests/statement-possible/block-body-cases.json`，组 `stage4b`（9 条：`{ let x = 1; f(); }`、
  `{ f(); g(); }`、嵌套块、块内 ASI、两块连写、混合、块内控制流、空语句、三条表达式）。
- 同组文本插入 `tests/statement-possible/cases.json`，`harness.mjs` 的 `GROUP_ORDER` 加入 `stage4b`，
  所以 `--all` 真的跑它。
- 断言（harness 自动）：① 壳路径 XML == legacy 逐字节；② AST 逐节点 == `ts.createSourceFile`；③ 同源码两次
  XML 相同；④ 形状树不泄漏 `StatementShape`。默认档 `pass=9 fail=0`、`file-fallback 0`、冲突 0。
- R1 形不在此组（见 §5.2），只在本文件与 §9 的探针里保留。

## 8. 全表读数（cwd = 本目录，最终提交实测）

| # | 门禁 | 读数 | 判定 |
|---|---|---|---|
| 1 | xl_build（core,typescript → ts） | 886 files / **0 error** / 2508 warning | PASS |
| 2 | `tsc -p tsconfig.json` | exit 0 | PASS |
| 3 | `ast-json.mjs` | 6167 cj-ok / 0 cj-fail（47 构造） | PASS |
| 4 | `git status --short typescript/cases` | **空** | PASS |
| 5 | `ast-json-diff.mjs` | 6167/6167 完全一致；结构差 0 / 位置差 0 / 字段差 0 | PASS |
| 6 | `tests/parse/validate.mjs` | 1720 条 / 0 不合格 | PASS |
| 7 | `token-ast.mjs --quiet` | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 | PASS（与基线同） |
| 8 | `real-dts-ast.mjs` | 226 文件：成功 226 / 崩溃 0 / AST 一致 226 | PASS |
| 9 | `harness --all` | groups run=8 skipped=3（stage4/stage5 既有 skip）；pass=**93** fail=0 known=1；冲突 0；fallback 0 | PASS（基线 84/0 → +9） |
| 10 | `harness --double-accept` | cases=112 failed=0；冲突 0 | PASS |
| 11 | `harness --lint` | PASS | PASS |
| 12 | `stage4-block` 组 | pass=12 fail=0 | PASS |
| 13 | `stage4b` 组 | pass=9 fail=0 | PASS |
| 14 | `op-ast-proof.mjs` / `op-proof.mjs` | 62/62、40/40（未受本轮影响，复跑绿） | PASS |
| 15 | `tests/feas-operator/*` | 6/6、9/9 | PASS |
| 16 | `perf.mjs` | many 2000 median **29.10ms** callsPerToken=16.01；scale ratio 2.04 / 1.84 | PASS（≤2.5） |

## 9. 复跑命令

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/harness.mjs --file=tests/statement-possible/block-body-cases.json --group=stage4b
node tests/statement-possible/harness.mjs --file=tests/statement-possible/block-cases.json --group=stage4-block
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/op-ast-proof.mjs ; node tests/statement-possible/op-proof.mjs
node tests/feas-operator/harness.mjs ; node tests/feas-operator/insert-between.test.mjs
node tests/statement-possible/perf.mjs
git checkout -- typescript/cases
```

接管计数探针（不进仓库，按需重建）：把 `{ let x = 1; f(); }` 等 9 条源码逐条 `SourceFileRunner.Parse`，
读 `StatementRouteUtil.BlockShellCount / BlockBodyStatementCount / FileFallbackCount`；再把
`StatementRouteUtil.EnableBlockBodyCatalog` 置 true 重跑一遍，即上表 §4 的两档读数。

## 10. 未覆盖清单

1. `EnableBlockBodyCatalog` 默认 false：块内 `let` / 表达式语句的 possible 接管**未在默认档启用**（D1/D2）。
2. 嵌套块的内层块体不接管（内层 `{` 没有目录；AST 正确，块 1 个壳）。
3. 块内控制流语句族（if/for/while/try/switch/labeled）仍 raw → legacy；混合时若 raw 语句吞到已建形状会抛错 →
   文件级 fallback（安全但慢）。
4. 第二块在默认档仍只建 1 个壳（flag=true 时 2/2，且块 2 走一次 fallback）。
5. R1 `let a = 1` ⏎ `{ b; }`：legacy 与壳路径都抛错，**文件级 fallback 无法兜底**（§5.2）。
6. 空语句 `;` 仍 legacy；块内 `;` 归属 legacy 递归。

## 11. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | §5.2 的源码形会抛错（基线既有，非本轮引入）；没有任何路径能建出它 | 已知；不进绿色用例；下一步修 `BuildExpressionStatement`/变量语句的 ASI 边界 |
| R2 | 打开 `EnableBlockBodyCatalog` 会改变块内第一条语句 `pos` 且末语句收口不稳 | 开关默认 false；§6 D1/D2 修完再开 |
| R3 | `BlockBodyWaitingPossibleShape` 占据位终结候选：块内出现未覆盖族时目录返回 Waiting，语句保持 raw —— 正确但慢 | 已用 stage4b 的 `{ ; }` / `{ if (a) b; }` 用例覆盖 |
| R4 | `StatementShape.FinishShell` 多了一个 `context` 形参（当前未读） | 仅为后续尾巴重放预留，不影响现有两条调用点 |
| R5 | lint 的 KNOWN（`as` 固定优先级 11）仍是基线既有项 | 非本轮引入 |
