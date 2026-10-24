# HANDOFF — s4b-r2（D1/D2 收口 + 块体目录默认打开 + 第二块建壳）

STATUS: **DONE / 全表绿**。默认 `EnableBlockBodyCatalog=true`，块内变量声明 / 表达式语句由 possible
增量建壳并经 `CollectBodyStatements` 按序收集；D1（块内首句 `pos`）与 D2（块内末句无分号在 `}` 前收口）
都已修好，第二块在默认档也建 2 个块壳。块内未覆盖语句族（if/while/…）不建壳，整段 raw 交回 legacy 递归。

BRANCH: `feature/possible-statement-s4b-r2`
BASE: `a8fda988`（= `feature/possible-statement`）
COMMITS:
| sha | 内容 |
|---|---|
| `ea33a344` | fix(s4b)：D1 首句 pos + D2 末句 `}` 前收口 |
| `c6ce971d` | feat(s4b)：打开 `EnableBlockBodyCatalog`、块壳在 `{` 建（含同文件第二块） |
| `903228fb` | test(s4b)：stage4b 17 条 + `block-body-takeover.mjs` |
| 本文件所在 commit | docs(s4b-r2)：handoff |

## 1. 完成度

1. **D1 已修**：`{ a; }` 的 `Identifier` range 由 `[0,3)` 变为 `[1,3)`（= TS）；`{ let x = 1; }` 的
   `VariableDeclarationList` 由 `[0,11)` 变为 `[1,11)`（= TS）。
2. **D2 已修**：`{ a }` / `{ f() }` / `{ let x = 1 }` / `{ let x = 1; f() }` / `{ a /*c*/ }` 全部
   AST == TS、XML == legacy、无 fallback；修复前这些形在 `}` 前收不了口（`{ a }` 的 AST 根甚至只剩一个裸 `Bracket`）。
3. **flag 已默认打开**（`statement-route-util.xl.md:100` = true），证据见 §3。
4. **第二块默认档 2 壳**：`{ a; }\n{ b; }` 在 flag=false 与 flag=true 下都是 `BlockShellCount=2`，
   flag=true 时 `BlockBodyStatementCount=2`；不再需要文件级 fallback（修复前块 2 必走一次 fallback）。
5. **专用 cases**：`stage4b` 由 9 条扩到 **17 条**（`block-body-cases.json` 与 `cases.json` 同步），
   `--all` 计入（pass 93 → **101**）。
6. **全表绿**（§4），ast-json 四步严格对拍 6167/6167、位置差 0。
7. **R1 未修**（本轮不要求）：`let a = 1` ⏎ `{ b; }` 在 legacy 与新路径都抛「表达式语句没有读完」，
   文件级 fallback 兜不住（fallback 走的就是 legacy）。与 HANDOFF-s4b §5.2 一致，未塞进绿色用例。

## 2. D1 / D2 的根因与修法

### 2.1 D1：块内首句 `pos` 差一格

- **根因**：块体目录（`CreateBodyPossibleShapes`）的宿主是块体 `{` 括号。变量 / 表达式候选建壳时按
  「`host.Data[start-1]` 里前一个非 trivia 单元的 `EndIndex`」算 `Pos`；块内首句前面没有兄弟单元，
  于是退回 `0`。TS 的块内首句 `pos` 是 `{` 之后第一个字符（**含前导 trivia**），即
  `bracket.StartIndex + 1`（legacy `BuildBlock` 的 `base` 也是这个口径）。
- **修法**（`variable-statement-possible-shape.xl.md` / `root-expression-statement-possible-shape.xl.md`
  的 `BuildByIndex`）：`host` 是 `{` 括号时，**只有前面没有非 trivia 单元**才用
  `bracket.StartIndex + 1`；后续语句仍取前一个兄弟的 `EndIndex`。没有改 `StatementBoundaryUtil` /
  `IsAsiBoundary` / 共享判据。
- **证据**：`{ a; }` TS `Identifier=[1,3)`，修复前 CJ `[0,3)`，修复后 `[1,3)`；
  `{ let x = 1; }` TS `VariableDeclarationList=[1,11)`，修复后一致。17 条 takeover 用例全部 AST==TS。

### 2.2 D2：块内末句无分号在 `}` 前收口

- **根因**：块体语句壳挂载在块体 `{` 括号上（`bracket.MountedUnit = 语句壳`）。`UnitToken.Process`
  把字符**整段**交给挂载单元，所以 `}` 先被语句壳吃掉，括号自己永远看不到它的结束字符；
  语句壳的终结候选只认 `;` / ASI 边界 / EOF，末句没有 `;` 时永远不收口。
  后果：`CollectBodyStatements` 见到未收口的 `StatementShape` 抛错 → 文件级 fallback；
  `{ a }` 在 EOF 路径上甚至只留下一个裸 `Bracket`（AST kind 与 TS 的 `Block` 不符）。
- **修法**（`statement-shape.xl.md` 新增 `protected ExitOrPre`）：只拦一种字符——**父单元是 `{` 括号、
  且字符正是该括号的 `}`**。拦到时先把壳里已到齐的最后一条语句 `BuildFromShell` 建出来并 `FinishShell`
  收口，然后返回 `Reload`（当前字符没被消费，驱动层重放，这次落到括号自己身上，括号正常关闭）。
  建不出来（未覆盖构造）时先 `DetachShell` 把 raw 单元按原位退回括号、同样 `Reload` —— 块体退回 legacy
  递归，**安全回退、不建错树**。
- **边界**：根级语句壳（父单元是 `SourceFileShape`）与 `(` / `[` 里的壳都不命中这条守卫，行为逐位不变。

### 2.3 第二块（`{ a; }\n{ b; }`）为什么之前会 fallback

- **根因**：块候选 `BuildByIndex` 里用 `moved.length === 1 && moved[0] instanceof Bracket` 认块体括号。
  同文件第二块的 `moved` 会**以 `{` 之前的换行 `WrapSymbol`（trivia）开头**，长度不是 1，于是
  `bodyBracket` 为 null、`shell.MountedUnit` 没设；块内字符全落到壳上，`WrapSymbol.Transit` 试图关闭
  仍未签出的括号 → `SourceRange is not set` → 文件级 fallback。
- **修法**：在 `moved` 里**按类型扫出** `{` 括号（取最后一个）再挂 `MountedUnit`。
- **第二块默认建壳**：`SourceFileShape.OnBracketCreatedEvent` 去掉 `EnableBlockBodyCatalog` 门控
  （仍保留 `EnableShellExpressions` 门控），默认档 `{` 一建出来就建块壳；块内仍走 legacy `BuildBlock`，
  所以 XML/AST 与「等 `}` 才建壳」逐字节相同。
- **只对语句首建壳**：事件里加
  `StatementRouteUtil.Decide(Data, 下标) == ShellBlock` 一道判据。标签体 `en:\n{ f() }` 的 `{` 不是
  条目首代码单元，不建壳；否则根表达式候选会借「晚建壳」把 `en : {` 吞进壳，逼出一次文件级 fallback
  （实测 dev 组的 `en:\n{ f() }\nenum E { A }` fallback 由 8/4 回到基线的 6/3）。

## 3. flag 打开的证据（同一进程直连 `build/ts`）

`tests/statement-possible/block-body-takeover.mjs` 的实测（`shells` = `BlockShellCount` 增量、
`body` = `BlockBodyStatementCount` 增量、`fb` = 文件级 fallback）：

| 源码 | flag=false | flag=true（默认） |
|---|---|---|
| `{ let x = 1; f(); }` | 1 / 0 / fb 0 | 1 / **2** / fb 0 |
| `{ f(); g(); }` | 1 / 0 / 0 | 1 / **2** / 0 |
| `{ a }` | 1 / 0 / 0 | 1 / **1** / 0 |
| `{ let x = 1 }` | 1 / 0 / 0 | 1 / **1** / 0 |
| `{ let x = 1; f() }` | 1 / 0 / 0 | 1 / **2** / 0 |
| `{ a; }` | 1 / 0 / 0 | 1 / **1** / 0 |
| `{ a; b; c; }` | 1 / 0 / 0 | 1 / **3** / 0 |
| `{ let a = 1\nlet b = 2\nf() }` | 1 / 0 / 0 | 1 / **3** / 0 |
| `{ a; }\n{ b; }` | **2** / 0 / 0 | **2** / **2** / 0 |
| `{ { a; } }` | 1 / 0 / 0 | 1 / 0 / 0（内层块 legacy，AST 正确） |
| `{ if (a) b; }` | 1 / 0 / 0 | 1 / 0 / 0（未覆盖族整段 raw → legacy） |
| `{ a; if (b) c; d; }` | 1 / 0 / 0 | 1 / **1** / 0（`a` 接管；raw 尾巴 legacy） |
| `{ /*c*/ a; }` / `{ a /*c*/ }` | 1 / 0 / 0 | 1 / **1** / 0 |
| `{ ; }` | 1 / 0 / 0 | 1 / 0 / 0（空语句 raw） |

`BlockBodyStatementCount>0` 只在 flag=true 出现，且每条都无 fallback —— 是「接管」而不是「legacy 兜底」。

## 4. 专用 cases（`tests/statement-possible/block-body-cases.json`，组 `stage4b`）

17 条：`{ let x = 1; f(); }`、`{ f(); g(); }`、`{ { a; } }`、`{ let a = 1\nlet b = 2\nf() }`、
`{ a; }\n{ b; }`、`{ let a = 1; f(); b; }`、`{ if (a) b; }`、`{ ; }`、`{ a; b; c; }`、
`{ let x = 1 }`、`{ a }`、`{ f() }`、`{ let x = 1; f() }`、`{ /*c*/ a; }`、`{ a /*c*/ }`、
`{ if (a) b; while (c) d; }`、`{ a; if (b) c; d; }`。

同一份用例文本也插入 `cases.json` 的 `stage4b` 组，`--all` 真的跑它（pass 93 → 101）。
harness 自动断言：① 壳路径 XML == legacy 逐字节；② AST 逐节点 == `ts.createSourceFile`；
③ 两次 Parse XML 相同；④ 形状树不泄漏 `StatementShape`。

新增 `tests/statement-possible/block-body-takeover.mjs`（17 条）额外断言：出厂默认 flag 为 true、
`BlockShellCount` / `BlockBodyStatementCount` 增量、**无文件级 fallback**（`LastFileFallback` 与
`FileFallbackCount` 双查）、XML == legacy、AST == TS、确定性、无壳泄漏。读数 `cases=17 failed=0 defaultFlag=true`。

## 5. 全表读数（cwd = 本目录，最终提交实测）

| # | 门禁 | 读数 | 判定 |
|---|---|---|---|
| 1 | xl_build（core,typescript → ts） | 886 written / **0 error** / 2508 warning（增量 6 个文件均 0 error） | PASS |
| 2 | xl_check 同参 | 886 file(s) / **0 error** / 2508 warning | PASS |
| 3 | `tsc -p tsconfig.json` | exit 0 | PASS |
| 4 | `block-body-takeover.mjs` | cases=17 failed=0，defaultFlag=true | PASS |
| 5 | harness `stage4b` | pass=**17** fail=0，fallback total=0 | PASS |
| 6 | harness `stage4-block` | pass=12 fail=0，fallback total=0 | PASS |
| 7 | harness `dev` | pass=22 fail=0，fallback 6/3 distinct（与基线同） | PASS |
| 8 | harness `operators-live` | pass=40 fail=0，fallback 0 | PASS |
| 9 | harness `--all` | pass=**101** fail=0 skip=0 known=1；groups run=8 skipped=3；冲突 0；fallback 0 | PASS |
| 10 | harness `--double-accept` | cases=**120** failed=0；冲突 0 | PASS |
| 11 | harness `--lint` | PASS（ASI 唯一 / 优先级数字表只在 operator-table；`as` 优先级 11 仍 KNOWN） | PASS |
| 12 | `tests/parse/validate.mjs` | 1720 条 / **0 不合格** | PASS |
| 13 | `ast-json.mjs` | total=6167 cj-ok=**6167** cj-fail=0（47 构造） | PASS |
| 14 | `git status --short typescript/cases` | **空** | PASS |
| 15 | `ast-json-diff.mjs` | 6167/6167 完全一致；结构差 0 / 位置差 0 / 字段差 0 | PASS |
| 16 | `token-ast.mjs --quiet` | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 | PASS（与基线同） |
| 17 | `real-dts-ast.mjs` | 226 文件：成功 226 / 崩溃 0 / AST 一致 226 | PASS |
| 18 | `op-ast-proof.mjs` | 62/62（形状树接管 62、TS 逐节点 62、数字叶子 8） | PASS |
| 19 | `op-proof.mjs` | 40/40（结构文本 40、InsertBetween 38） | PASS |
| 20 | `feas-operator/harness.mjs` | 6/6 | PASS |
| 21 | `insert-between.test.mjs` | 9/9 | PASS |
| 22 | `perf.mjs` | long 300 中位 **5.78ms**；many 2000 中位 **30.59ms**、callsPerToken=16.01；比例 1.80 / 2.29 | PASS（线性，≤2.5） |

说明：ast-json 四步已按「重生成 → `git status` 空 → `diff` 0/0/0」走完，最后 `git checkout -- typescript/cases`，
工作树只剩本轮的 8 个改动路径 + 1 个新测试文件（均已提交）。

## 6. 未覆盖清单（更新）

1. **嵌套块的内层块体不接管**：`{ { a; } }` 只有外层块壳（`BlockBodyStatementCount=0`）；内层块由
   `BuildBlock` 的 legacy 递归建，AST 正确。内层 `{` 没有目录、也没有块壳。
2. **块内控制流语句族不壳化**：if / for / while / do / switch / try / with / labeled / return / throw /
   break / continue / debugger 走 `StatementRoute.Legacy`，目录不建壳；这些语句作为 raw 尾巴由
   `CollectBodyStatements` 里的内层 `StatementBuilder` 逐条建（或整块 legacy），XML/AST 与 legacy 一致。
   若某条 raw 语句把已建形状吞成子语句，才会抛错 → 文件级 fallback（安全但慢）；本轮 17 条未触发。
3. **R1 未修**：`let a = 1` ⏎ `{ b; }` 两条路径都抛「表达式语句没有读完」，fallback 无法兜底
   （fallback 走 legacy）。按本轮要求不修，保持记录。
4. **空语句 `;` 仍 raw**：`{ ; }` 的 `BlockBodyStatementCount=0`，由 legacy 递归建（AST 正确）。
5. **`BlockBodyStatementCount` 的口径**：只统计「由 possible 建成、再被 `CollectBodyStatements` 收集」的
   语句；raw 尾巴里由内层 `BuildStatement` 建的语句不计入。它是「接管」的证据，不是「块内语句总数」。
6. **标签体 / 函数体 / 类体不建块壳**：`en:\n{ f() }` 的 `{` 不是条目首代码单元（`Decide` 判据），
   `function f() { ... }` / 类成员的 `{` 由各自的声明壳处理，`OnBracketCreatedEvent` 不介入。
7. **`LeftoverReplayCount` / `LeftoverReplayFailed`**：字段仍存在但本路径未自增（`FinishShell` 目前不读
   `context`、不做父目录重放）；`AST range` 修复不依赖它们。属基线遗留的文档/实现口径差，记在这里。

## 7. 风险

| id | 风险 | 现状 / 兜底 |
|---|---|---|
| R1 | `let a = 1` ⏎ `{ b; }` 抛错（基线既有，非本轮引入） | 已知；不进绿色用例；无任何路径能兜住 |
| R2 | 块内末句无分号的收口靠 `StatementShape.ExitOrPre` 的 `Reload` | 只拦「父单元是 `{` 括号 + 字符是它的 `}`」，D1/D2 两档 17 条 + ast-json 6167 全绿 |
| R3 | 未覆盖族与已建形状混合时仍可能抛错 → 文件级 fallback | 安全回退、AST 与 legacy 一致；stage4b 17 条 fallback=0，dev 保持基线 6/3 |
| R4 | `many 2000` 中位 30.59ms（基线 29.10ms，+5%） | 比例 1.80 / 2.29 仍线性，未超 2.5 告警线 |
| R5 | `as` / `satisfies` 固定优先级 11 仍在 `expression-builder`（lint KNOWN） | 基线既有，非本轮引入 |
| R6 | `--all` 的 101 隐含 3 个 SKIP（dev / stage4 / stage5）；dev 单独 22 绿，stage4/stage5 是未实现占位 | 引用 101 时需同时说明 skip 口径 |
| R7 | `token-ast` 10 条 `ts-invalid`（TS 自身不支持该源码） | 基线既有 |

## 8. 复跑命令

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/block-body-takeover.mjs
node tests/statement-possible/harness.mjs --file=tests/statement-possible/block-body-cases.json --group=stage4b
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
