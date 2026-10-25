# HANDOFF — Stage 5d-2b：带体 / 链式控制流族判界迁出 `ScanRoot`

分支 `feature/possible-statement-5d2b`，基线 `e2c2b114`（= b5f844ae + 5d-2a）。
本轮是**单提交**（三个 `.xl.md` + 专用探针 + 探针期望同步 + 本文件），subject：
`refactor(statements): 带体/链式控制流族判界迁出 ScanRoot（Stage 5d-2b）`；hash 见 `git log -1`
（不在此处固化，避免 amend 造成自引用）。`tmp/` 下的调查与反事实脚本不入库。

## 1. 结论先行

1. **十个族 / 形态的判界已迁到 `possible/boundary` 层**：`if`（含 `else` / `else if` 链）、`while`、
   `do-while`、`for`·`for-in`·`for-of`·`for await`、`try`·`catch`·`finally`、`switch`、`with`、
   标签语句、块语句。终结候选（`StatementEndPossibleShape.ComputeByIndex` / `BuildByIndex`）与
   `StatementShape.TryToClose` 对它们**不再调用 `StatementScanner.ScanRoot`**：
   专用探针实测**终结候选路径 331 次 → 0 次、TryToClose 30 条语料 → 0 条**（逐族见 §2）。
2. **没有「把 `ScanRoot` 改名」**：族判定（`IsControlFlowFamilyCode` / `IsLabelHead`）与每族收口
   （`IfStatementEndCode` / `LoopStatementEndCode` / `ForStatementEndCode` / `DoStatementEndCode` /
   `TryStatementEndCode` / `TryCatchEndCode` / `TryFinallyEndCode` / `ScanBodyEndCode`）都在
   `StatementBoundaryUtil`；链式关键字前瞻（`else` / `while` / `catch` / `finally`）逐条搬在 boundary 层，
   读的是扫描器同一个 `NextWord` / `NextChar`。**语句体的终点仍读 `StatementScanner.ScanBody`**
   （唯一实现点，它本身不调用 `ScanRoot`）——不在这里重写第二套语句文法（理由与退场方式见 §6-2）。
3. **5d-2a 的短语句族没有回退**：`IsShortFamilyCode` 分支逐字未动、分派顺序仍在控制流族之前；
   短族探针（同步后的 46 条）**46/46**，其终结候选读数保持 0。
4. **默认全门零回归**：ast-json `6171/6171`、ast-json-diff `0/0/0`、token-ast `1706/0/0`、
   real-dts `226/226`、harness `102/0/known=0`、double-accept `120/0`、takeover `33/33`、
   validate `1720/0`、final-matrix `38/38`、op-ast-proof `94/94`、op-proof `40/40`（§4）。
5. **语义 / AST 安全**：专用探针 `tests/statement-possible/control-flow-boundary.mjs` **85/85**
   （77 条迁出族形态 + 6 条对照 + 2 条正对照；knownGap=1 是 `try { a(); }` 这个**本轮之前就存在**的
   TS 错误恢复形缺口）。每条都做 AST 逐节点对拍（vs `ts.createSourceFile`）与 `XML == legacy`
   （`EnableShellExpressions=false` + `EnableDeclarationShell=false`）；无文件级 fallback、无形状泄漏。
6. **未改**：`core/**`、`statement-scanner`、`statement-builder`、`statement-possible-shape`（legacy）、
   `block-possible-shape` / `control-flow-statement-possible-shape` / 子句候选；`IsAsiBoundary` 函数体
   一字未动；开关未切、未 push、未合并。

## 2. 逐族迁移与前后 ScanRoot 计数

计数口径：`tests/statement-possible/control-flow-boundary.mjs` monkeypatch `StatementScanner.ScanRoot`，
按**最内层调用帧**归因 + 按 `code[0]` 独立归族（**不读**本轮的 `IsControlFlowFamilyCode`，否则反事实
中和后计数会一起消失）。`endPath` = `StatementEndPossibleShape.ComputeByIndex` + `.BuildByIndex`。
before = 基线 `e2c2b114`（`git stash` 三个 `.xl.md` → `xl_build` → `tsc` → 跑同一支探针），
after = 本轮。同一 85 条语料逐字解析一次。

| 族 / 形态 | 判据入口（boundary 层） | endPath 前 → 后 | TryToClose 前 → 后 |
| --- | --- | --- | --- |
| `if`（含 `else` / `else if` 链） | `IfStatementEndCode` | **115 → 0** | 10 条语料 → 0 |
| `while` | `LoopStatementEndCode` | **23 → 0** | 4 → 0 |
| `do-while` | `DoStatementEndCode` | **34 → 0** | 6 → 0 |
| `for` / `for-in` / `for-of` / `for await` | `ForStatementEndCode` | **26 → 0** | 5 → 0 |
| `try` / `catch` / `finally` | `TryStatementEndCode`（+ `TryCatch` / `TryFinally`） | **57 → 0** | 0 → 0 |
| `switch` / `case` / `default` | `LoopStatementEndCode` | **33 → 0** | 0 → 0 |
| `with` | `LoopStatementEndCode` | **11 → 0** | 1 → 0 |
| 标签 `标识符 :` | `ControlFlowFamilyEndCode` → `ScanBodyEndCode(code, 2)` | **18 → 0** | 2 → 0 |
| 块 `{…}` | `ControlFlowFamilyEndCode` → `0`（首单元即整条语句） | **14 → 0** | 0 → 0 |
| —— 合计（迁出族） | | **331 → 0** | **30 条 → 0 条** |
| 正对照：块内 `class` 声明体壳（**未迁**） | `DeclarationBodyEndCode`（`ScanRoot` 分支里的兜底） | **6 → 6** | 0 → 0 |

**残余（逐位不变，且都在本 Stage 禁止修改的文件里）**：

| 调用点 | 何时 | 逐族次数 | 为什么不能在本轮消掉 |
| --- | --- | --- | --- |
| `StatementPossibleShape.ComputeByIndex`（legacy 根候选） | 每个文件至少一次（EOF 哨兵格，`code` 前缀为空） | 1 / 语料 | `statement-possible-shape.xl.md` 不在允许改的文件清单里；与基线逐位相同 |
| 短语句族的 `TryToClose` | `return 1;` / `let a = 1;` 这类文件末尾未闭合壳 | 2 条语料（5d-2a 遗留，**本轮未改**） | 本轮只给控制流族加同源分支；短族那一格留给退场轮 |

> 注意「按族 ScanRoot 总数 = 0」在**本 Stage 不可达**：legacy 根候选本身仍活在目录里，它对每个文件
> 在 EOF 哨兵格调用一次（`code` 为空，归族为 `?`）。本轮负责的是**终结候选路径 + EOF 兜底**归零，
> 这与 5d-2a 的口径一致，残余已如实列出。

逐族 before 明细（探针原始读数，`tmp/before-control-flow.txt`）：

```
[control-flow-boundary] cases=85（迁出族 77 / 正对照 2） pass=9 failed=76 knownGap=1
[control-flow-boundary] 终结候选路径 ScanRoot 调用（按族合计）：
  {"if":115,"while":23,"do":34,"for":26,"try":57,"switch":33,"with":11,"label":18,"block":14,"class":6}
[control-flow-boundary] TryToClose 上有本族 ScanRoot 调用的语料（30 条）：…
```

after：

```
[control-flow-boundary] cases=85（迁出族 77 / 正对照 2） pass=85 failed=0 knownGap=1
[control-flow-boundary] 终结候选路径 ScanRoot 调用（按族合计）：{"class":6}
[control-flow-boundary] TryToClose 上有本族 ScanRoot 调用的语料（2 条）：
  ["control-short-return","control-short-variable"]
```

## 3. 判据怎么读（为什么不是第二套文法）

### 3.1 族判定

`IsControlFlowFamilyCode(code)` 只回答「首代码单元是不是本族」，并与 `ScanRoot` 的分派条件逐条对齐：

- 七个关键字（`if` / `while` / `do` / `for` / `try` / `switch` / `with`）在 `ScanRoot` 里各自 `return`，
  这里无条件认；
- 首单元是 `{` 括号 → 块语句（`ScanRoot` 对首单元 `{` 也答 `Complete(0)`）；
- `declare` / `await` / `using` / 短语句族关键字在 `ScanRoot` 里有专门分支、**不会**落到标签判据，
  这里也不认（短族由 `IsShortFamilyCode` 在族分派里**先**分流；`let:` 这一格 `IsShortFamilyCode`
  已答 `false`，这里按标签接住）；
- 其余 `Common` 在 `ScanRoot` 里只剩标签判据一条路（`标识符 :`），`IsLabelHead` 读同一口径
  （下一格是 `:`，或 `:` 还没被 token 化时读 `NextChar`）。

### 3.2 每族收口

- `IfStatementEndCode`：`(…)` 头 + 体；体到齐后本层有 `else` 就再吃一条体，本层没有就按
  `NextWord` 前瞻「文档里还有没有 `else`」决定等不等。`else if` 是 `ScanBody` 的自然递归。
- `LoopStatementEndCode`：`(…)` 头 + 体（`while` / `switch` / `with` 三者同构，与 `ScanLoop` 同一条）。
- `ForStatementEndCode`：可选 `await` + `(…)` 头 + 体（`for-in` / `for-of` 的差异在头括号**内部**，
  头是整单元，这里不看）。
- `DoStatementEndCode`：体（`stopAtWhile`）+ `while` + `(…)`；条件头之后的下一个**原始字符**不是 `;`
  → 语句已完整，收在条件括号上（TS 的 `do {} while (b)` 后面同一行再起语句也是两条）；缺 `while`
  的恢复形交给 `StatementScanner.ScanConditionEnd`（唯一实现点）。
- `TryStatementEndCode` / `TryCatchEndCode` / `TryFinallyEndCode`：`{…}` + 可选 `catch`（可带/不带
  绑定）+ 可选 `finally`，链式前瞻同样读 `NextWord`。
- 标签：`ScanBodyEndCode(code, 2)`。
- 块：首单元 `{…}` 就是整条语句，`0`。

### 3.3 体终点为什么仍读 `ScanBody`

语句体可以是任意语句（块 / 表达式 / 短语句 / 嵌套控制流 / 声明体）。把它在 boundary 层重写一遍就是
**第二套语句文法**，与本项目「判据单一实现点」的规矩冲突；而 `StatementScanner.ScanBody` 本身
**不调用 `ScanRoot`**（它按首单元分派到各族的体扫描），所以「不调 `ScanRoot`」这条硬约束仍然成立。
`AtEOF` 读的是调用方在分派前刚设置的 `StatementScanner.AtEOF`（`ComputeByIndex` / `BuildByIndex` /
`TryToClose` 都在分派前算过同一个值，与 `ScanRoot` 读的是同一个事实），不在这里重算。

## 4. 专用探针读数（入库）

```
[control-flow-boundary] cases=85（迁出族 77 / 正对照 2） pass=85 failed=0 knownGap=1
[control-flow-boundary] 终结候选路径 ScanRoot 调用（按族合计）：{"class":6}
[control-flow-boundary] TryToClose 上有本族 ScanRoot 调用的语料（2 条）：
  ["control-short-return","control-short-variable"]
```

`tests/statement-possible/control-flow-boundary.mjs` 的 85 条形态：

- `if` / `else`（16）：单语句体、块体、`else`、`else if`（单/块链）、嵌套块、**悬垂 `else`**、
  体内 `return`、体后 ASI、`else` 跨行、空体、文件末尾不收 `;`、空块链；
- `while`（6）：单/块体、空体、体内 `break`、体后 ASI、文件末尾；
- `do-while`（7）：单/块体、条件头不带 `;`、条件头后 ASI 接下一句、空体、体内嵌 `if`、`while` 跨行；
- `for`（10）：空头、经典头、`for-in`、`for-of`、`for await`、体内 `break`、空体、体后 ASI、
  文件末尾、体内嵌 `break`；
- `try`（11）：`catch`、`finally`、`catch+finally`、无绑定 `catch`、链后接下一句、体内 `throw`、
  体内嵌 `while`、缺 `catch/finally` 兜底（knownGap）、空 `catch` / `finally` 块、三链跨行；
- `switch`（9）：空、`default`、`case+default`、fallthrough、子句内嵌 `if`、只有 `case`、
  文件末尾、子句 `return`、链后接下一句；
- `with`（3）、标签（6：块 / `for` / `while` / `if` / 嵌套块 / `let:` 标签形态）；
- 块（5：多语句 / 空 / 内嵌 `if` / 嵌套块 / 内嵌 `switch`）；
- 混合与链式跨行（3）：`do` 后接 `if`、`if` 后接 `while`、标签块内 ASI；
- 对照（6）：短语句族 2（`return 1;` / `let a = 1;`，读数保持 0）、表达式 / 声明族 4；
- 正对照（2）：`{ class C {} }` / `switch (a) { case 1: class C {} }`——块内 `class` 声明体壳仍应
  在终结候选路径上读 `ScanRoot`（实测 6 次，前后不变）。

`short-family-boundary.mjs` 同步（**不弱化短族断言**）：原来的 13 条控制流「对照」现在也已迁出，
期望从「> 0」改成「= 0」；另加 2 条正对照（块内 `class` 壳）。读数：
`cases=46（迁出族 44 / 正对照 2） pass=46 failed=0`。

### 4.1 反事实（证明断言不空转）

`node tmp/probe-counterfactual.mjs family`：把 `StatementBoundaryUtil.IsControlFlowFamilyCode` 中和成
`() => false`（= 终结候选退回 `ScanRoot`，等价迁移前），探针立刻变红 **76/85**，读数回到 before 的
`{"if":115,"while":23,"do":34,"for":26,"try":57,"switch":33,"with":11,"label":18,"block":14}`。

`node tmp/probe-counterfactual.mjs else`：只把 `IfStatementEndCode` 换成「只收体尾」（去掉 `else` 前瞻），
探针变红 **8 条**——正好是全部 `if…else` 形态（`if-else-expr` / `if-else-block` / `if-else-if-chain` /
`if-else-if-block-chain` / `if-else-newline` / `if-body-newline-else` / `if-empty-blocks` /
`if-else-if-empty`），其余 77 条仍绿。说明 `else` / `else if` 链的关键字前瞻确实是探针在测的东西。

## 5. 改动文件

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/statement-boundary-util.xl.md` | **+354 / −0**：新增 `IsControlFlowFamilyCode`、`IsLabelHead`、`ControlFlowFamilyEndCode`、`ScanBodyEndCode`、`IfStatementEndCode`、`LoopStatementEndCode`、`ForStatementEndCode`、`DoStatementEndCode`、`TryStatementEndCode`、`TryCatchEndCode`、`TryFinallyEndCode`（11 个静态方法 + 逐族文档；无一处调用 `ScanRoot`） |
| `typescript/tokens/statements/statement-end-possible-shape.xl.md` | **+36 / −6**：`ComputeByIndex`（短族之后、`ScanRoot` 之前）、`BuildByIndex` 的 EOF 分支与普通分支各插入控制流族分派；类 / 方法文档同步 |
| `typescript/tokens/statements/statement-shape.xl.md` | **+17 / −3**：`TryToClose` 只加一个同源分支（`IsControlFlowFamilyCode` → `ControlFlowFamilyEndCode`），既有分支顺序与判据未重排 |
| `tests/statement-possible/control-flow-boundary.mjs` | **新增 405 行**（85 条用例 + 独立归族计数 + 正对照 + knownGap 说明） |
| `tests/statement-possible/short-family-boundary.mjs` | **+37 / −20**：期望同步（13 条控制流对照改为「已迁出」+ 2 条正对照；短族断言不变） |

`git diff --stat` 只有上面三个 `.xl.md` 与两个探针；`build/ts`、`dist/ts` 是生成物（`xl_build` + `tsc`
重建，未手改）。`tmp/probe-scanroot.mjs`、`tmp/probe-counterfactual.mjs`、`tmp/before-control-flow.txt`、
`tmp/after-control-flow.txt`、`tmp/cf-family.txt`、`tmp/cf-else.txt` 是**调查用，未入库**。

## 6. 未迁族与风险（诚实清单）

1. **本轮明确未迁（允许）**：`declare` 的 ambient 变量语句（`declare const x`）、`using` / `await using`、
   `class`·`function` 等带体声明、子句级声明体。它们仍走 `else` 分支的 `ScanRoot`
   （`Status == 1 && End >= 0`）+ `DeclarationBodyEndCode` 兜底。正对照 `{ class C {} }` 的 6 次读数
   前后不变，证明这条分支仍在工作。
2. **判据现在是两份实现**：`StatementScanner` 的 `ScanIf` / `ScanLoop` / `ScanFor` / `ScanDo` / `ScanTry` /
   `ScanCatch` / `ScanFinally`（legacy 根候选与块内原子建树仍在用）与 boundary 层的同名规则。
   这是「legacy 未退场」阶段的必然重复，一致性靠三条锁：逐字搬迁、默认全门（6171 + 1716 + 226 条语料里
   这些族大量出现）、专用探针的 AST+XML 对拍 + 链式反事实。**退场轮可以把 Scanner 那一组函数连同
   `ScanRoot` 的对应分支一起删**，届时只留 boundary 层这一份；`ScanBody` 也要随之搬或保留为唯一实现。
3. **`try { a(); }`（缺 `catch/finally`）的 AST 缺口是既有的**：TS 会在末尾插一个零宽
   `Block [12,12)`（`TryStatement` 的缺失 finally 块），legacy 路径本来就不建它。本轮**没有**改变这一点
   （`XML == legacy` 仍然成立、无 fallback），探针把它记为 `knownGap=1` 而不是假装通过。判界本身
   （收在 try 块上）由 XML / 迁移读数覆盖。
4. **`atEof` 的语义必须与调用方一致**：`ControlFlowFamilyEndCode` 不接 `atEof` 参数，读的是调用方在
   分派前刚设置的 `StatementScanner.AtEOF`（三个调用点都与基线 `ScanRoot` 读同一个值）。将来若在别处
   调用，必须传同一个事实。
5. **链式前瞻读文档原文**：`else` / `catch` / `finally` / do-while 的 `;` 可能还没被 token 化，判据读
   `NextWord` / `NextChar`（与 `ScanRoot` 同一实现）。这意味着「文件末尾 + 后面还有 `else`」会**继续等**
   （与基线一致），不会被判成提前收口。
6. **`label-let`（`let: 1;`）** 依赖「短族先判、控制流族接标签」这个顺序：`IsShortFamilyCode` 对
   `let:` 答 `false`，`IsControlFlowFamilyCode` 才把它当标签。改动任一判据的分派顺序都会让它回到
   `ScanRoot`（探针里的 `label-let` 会红）。

## 7. 默认全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空（已 `git checkout --`） |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38，failed=0；knownGap=1 是既有的 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/control-flow-boundary.mjs`（本次新增） | **85 / 85**（knownGap=1） |
| `tests/statement-possible/short-family-boundary.mjs`（期望同步） | **46 / 46** |

与 Lead 给的基线读数**逐项相同**（零回归）。

## 8. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d2b

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序）
#   xl_build 工具：cwd=本目录，paths=["core","typescript"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 专用探针（入库）
node tests/statement-possible/control-flow-boundary.mjs
node tests/statement-possible/control-flow-boundary.mjs --verbose
node tests/statement-possible/short-family-boundary.mjs

# 逐族 before/after 读数（tmp，不入库；用探针本身跑两次即可）
#   before：git stash push 三个 .xl.md → xl_build → tsc → node tests/statement-possible/control-flow-boundary.mjs
#   after ：git stash pop → xl_build → tsc → 同一支探针

# 反事实（证明迁移读数敏感；tmp 脚本需按 §4.1 重建）
node tmp/probe-counterfactual.mjs family   # 期望 76/85 红
node tmp/probe-counterfactual.mjs else     # 期望 8/85 红（全部 if…else）

# 默认全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git checkout -- typescript/cases          # ast-json 会写快照，测完必须还原
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
```

回退：

```powershell
git revert <本轮的 commit>      # 源码 + 探针 + HANDOFF 一起回退（单提交）
# build/ts、dist/ts 是生成物：回退后重新 xl_build + tsc 即可
```

只想**软退**控制流族这一层（保留探针、不重编）：把
`StatementBoundaryUtil.IsControlFlowFamilyCode` 临时中和成 `() => false` 即回到迁移前行为
（`tmp/probe-counterfactual.mjs family` 的做法），或把 `ControlFlowFamilyEndCode` 改成恒 `-1`
（会退到 `ScanRoot` 分支，等价迁移前）。
