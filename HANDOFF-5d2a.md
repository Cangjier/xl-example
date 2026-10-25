# HANDOFF — Stage 5d-2a：短语句族判界迁出 `ScanRoot`

分支 `feature/possible-statement-5d1b`，基线 `b5f844ae`（转正 + gap-AS1 修复）。
本轮是**单提交**（两个 `.xl.md` + 专用探针 + 本文件），subject：
`refactor(statements): 短语句族判界迁出 ScanRoot（Stage 5d-2a）`；hash 见 `git log -1`
（不在此处固化，避免 amend 造成自引用）。`tmp/` 下的探针不入库。

## 1. 结论先行

1. **六个族的判界已迁到 `possible/boundary` 层**：`return` / `throw`（含受限产生式 ASI）、
   `break` / `continue`（含标签与换行）、`debugger`、`let`·`const`·`var` 变量声明。
   终结候选（`StatementEndPossibleShape.ComputeByIndex` / `BuildByIndex`）对这六族**不再调用
   `StatementScanner.ScanRoot`**：探针实测**终结候选路径 62 次 → 0 次**（逐族见 §3）。
2. **迁移范围精确**：if / while / for / try / switch / do / with / label / 块的对照语料，
   同一条路径**仍是 36 次 → 36 次**（不是把开关关掉，也不是把 `ScanRoot` 短路）。
3. **默认全门零回归**：ast-json `6171/6171`、ast-json-diff `0/0/0`、token-ast `1706/0/0`、
   real-dts `226/226`、harness `102/0/known=0`、double-accept `120/0`、takeover `33/33`、
   validate `1720/0`、final-matrix `38/38`、op-ast-proof `94/94`、op-proof `40/40`（§4）。
4. **语义 / AST 安全**：专用探针 `tests/statement-possible/short-family-boundary.mjs`
   **44/44**（31 条迁出族形态 + 13 条对照），每条都做 AST 逐节点对拍（vs `ts.createSourceFile`）
   与 `XML == legacy`（`EnableShellExpressions=false`）；无文件级 fallback、无形状泄漏。
5. **未改**：`core/**`、`statement-shape`、`statement-scanner`、`statement-builder`、
   `statement-possible-shape`（legacy）；`IsAsiBoundary` 函数体一字未动；开关未切、未 push、未合并。

## 2. 逐族迁移结果（before = 基线 `b5f844ae`，after = 本轮）

计数口径：`tmp/probe-scanroot.mjs` monkeypatch `StatementScanner.ScanRoot`，
按**最内层调用帧**归因；`endPath` = `StatementEndPossibleShape.ComputeByIndex` + `.BuildByIndex`
（本轮迁出的那条路径）。同一语料逐字解析一次。

| 族 | 判据入口（boundary 层） | endPath 前 → 后 | 残余前 → 后 |
| --- | --- | --- | --- |
| `return` / `throw` | `ReturnThrowEndCode` | **10 → 0** | 1 → 1（legacy） |
| `break` / `continue` | `BreakContinueEndCode` | **7 → 0** | 1 → 1（legacy） |
| `debugger` | `SimpleSemicolonEndCode` | **4 → 0** | 1 → 1（legacy） |
| 变量声明 `let`/`const`/`var` | `VariableStatementEndCode` → `ScanToSemicolonIncremental` | **24 → 0** | 9 → 9（legacy 8 + TryToClose 1） |
| 空语句 `;` | 既有 `EmptyStatementEndCode`（gap-SW §1，**本轮未改代码**） | **0 → 0** | 3 → 3（TryToClose 2 + legacy 1） |
| —— 合计（迁出族） | | **62 → 0** | 20 → 20 |
| 对照：if / while / for / try / switch / do / with / label / 块 | 仍走 `ScanRoot`（本轮允许） | **36 → 36** | 14 → 14 |

逐族用例与读数（before 全文见 §3.1）：

- `return`：`return 1;` / `return;` / `return (x);` / `return\nx;`（受限产生式 ASI）——4 条语料 10 → 0；
- `throw`：`throw e;` / `throw new Error("x");` / `throw\na;`——3 条语料 10 → 0；
- `break`：`break lbl;` / `break;` / `break\nlbl;`——7 → 0；`continue`：`continue lbl;` / `continue;` / `continue\nlbl;`——7 → 0；
- `debugger`：`debugger;` / `debugger\nx;`——4 → 0；
- 变量：`let a = 1;` / `const b = 2;` / `var c = 3;` / `let d = 1` ⏎ `let e = 2` / `const { f } = o;` ⏎ `g();` / `var h`（EOF）——24 → 0；
- 空语句：`;` / `;` / `; ;`——0 → 0（它本来就不在 `ScanRoot` 分支上：空语句壳由 `EmptyStatementEndCode` 在族分派**之前**判）。

**残余（`residual`）逐位不变，且都在本 Stage 禁止修改的文件里**：

| 调用点 | 何时 | 逐族次数 | 为什么不能在本轮消掉 |
| --- | --- | --- | --- |
| `StatementPossibleShape.ComputeByIndex`（legacy 根候选） | 关键字格（`let` / `const` / `var` 只有关键字时）、EOF 哨兵格、`FinishShell` 的 leftover 重放 | 1~8 / 语料 | `statement-possible-shape.xl.md` 不在允许改的文件清单里；它与基线逐位相同 |
| `StatementShape.TryToClose`（壳的 EOF 兜底） | 文件末尾仍未闭合的壳（`var h` / `;` 结尾） | 1~2 / 语料 | `statement-shape.xl.md` 本轮禁改（另一成员 5d-1a 正在加仪器） |

## 3. 探针读数

### 3.1 逐族 ScanRoot 计数（`tmp/probe-scanroot.mjs`，不入库）

修复前后各跑一次同一支探针（before = `git stash` 本轮两个 `.xl.md` → `xl_build` → `tsc` → 跑探针 →
`git stash pop`；after = 恢复后同一流程）。

before（基线）：

```
return           迁出  total= 11  endPath= 10  residual=1  {"end.ComputeByIndex":6,"end.BuildByIndex":4,"legacy.ComputeByIndex":1}
throw            迁出  total= 11  endPath= 10  residual=1  {"end.ComputeByIndex":7,"end.BuildByIndex":3,"legacy.ComputeByIndex":1}
break            迁出  total=  8  endPath=  7  residual=1  {"end.ComputeByIndex":4,"end.BuildByIndex":3,"legacy.ComputeByIndex":1}
continue         迁出  total=  8  endPath=  7  residual=1  {"end.ComputeByIndex":4,"end.BuildByIndex":3,"legacy.ComputeByIndex":1}
debugger         迁出  total=  5  endPath=  4  residual=1  {"end.ComputeByIndex":2,"end.BuildByIndex":2,"legacy.ComputeByIndex":1}
empty            迁出  total=  3  endPath=  0  residual=3  {"shape.TryToClose":2,"legacy.ComputeByIndex":1}
variable         迁出  total= 33  endPath= 24  residual=9  {"legacy.ComputeByIndex":8,"end.ComputeByIndex":18,"end.BuildByIndex":6,"shape.TryToClose":1}
control-if       对照  total= 10  endPath=  8  residual=2  {"end.ComputeByIndex":7,"end.BuildByIndex":1,"shape.TryToClose":1,"legacy.ComputeByIndex":1}
control-loop     对照  total= 11  endPath=  9  residual=2  {"end.ComputeByIndex":7,"end.BuildByIndex":2,"shape.TryToClose":1,"legacy.ComputeByIndex":1}
control-try      对照  total=  8  endPath=  7  residual=1  {"end.ComputeByIndex":6,"end.BuildByIndex":1,"legacy.ComputeByIndex":1}
control-switch   对照  total=  4  endPath=  3  residual=1  {"end.ComputeByIndex":2,"end.BuildByIndex":1,"legacy.ComputeByIndex":1}
control-other    对照  total= 10  endPath=  9  residual=1  {"end.ComputeByIndex":6,"end.BuildByIndex":3,"legacy.ComputeByIndex":1}
--- 汇总：迁出族 endPath 合计=62（期望 0），其它族 endPath 合计=36（期望 > 0）
RESULT FAIL（迁移前应当 FAIL，这是「断言敏感」的证据）
```

after（本轮）：

```
return           迁出  total=  1  endPath=  0  residual=1  {"legacy.ComputeByIndex":1}
throw            迁出  total=  1  endPath=  0  residual=1  {"legacy.ComputeByIndex":1}
break            迁出  total=  1  endPath=  0  residual=1  {"legacy.ComputeByIndex":1}
continue         迁出  total=  1  endPath=  0  residual=1  {"legacy.ComputeByIndex":1}
debugger         迁出  total=  1  endPath=  0  residual=1  {"legacy.ComputeByIndex":1}
empty            迁出  total=  3  endPath=  0  residual=3  {"shape.TryToClose":2,"legacy.ComputeByIndex":1}
variable         迁出  total=  9  endPath=  0  residual=9  {"legacy.ComputeByIndex":8,"shape.TryToClose":1}
control-if       对照  total= 10  endPath=  8  residual=2  {"end.ComputeByIndex":7,"end.BuildByIndex":1,"shape.TryToClose":1,"legacy.ComputeByIndex":1}
control-loop     对照  total= 11  endPath=  9  residual=2  {"end.ComputeByIndex":7,"end.BuildByIndex":2,"shape.TryToClose":1,"legacy.ComputeByIndex":1}
control-try      对照  total=  8  endPath=  7  residual=1  {"end.ComputeByIndex":6,"end.BuildByIndex":1,"legacy.ComputeByIndex":1}
control-switch   对照  total=  4  endPath=  3  residual=1  {"end.ComputeByIndex":2,"end.BuildByIndex":1,"legacy.ComputeByIndex":1}
control-other    对照  total= 10  endPath=  9  residual=1  {"end.ComputeByIndex":6,"end.BuildByIndex":3,"legacy.ComputeByIndex":1}
--- 汇总：迁出族 endPath 合计=0（期望 0），其它族 endPath 合计=36（期望 > 0）
RESULT PASS：迁出族在终结候选路径上 0 次 ScanRoot 调用；其它族仍 > 0 次；无 fallback / 无抛错
```

读数方法上的两个坑（踩过、已修）：

1. **归因必须取最内层帧**。`BuildByIndex` 会经 `StatementShape.FinishShell` 把 leftover 交回父单元，
   重放里 legacy 候选**自己**会调 `ScanRoot`；若按「栈里出现过 `BuildByIndex`」归因，会把 legacy 的调用
   记成终结候选路径的残留（基线 variable 会虚高 2 次，读数 26 而不是 24）。
2. **`endPath` 与 `total` 必须分列**。每个文件都至少有 1 次 legacy 在 EOF 哨兵格 / 关键字格上的调用，
   所以「总调用数 = 0」不可达；本条 Stage 能负责的是**终结候选路径**归零。

### 3.2 专用探针（入库）：`tests/statement-possible/short-family-boundary.mjs`

```
[short-family-boundary] cases=44（迁出族 31 / 对照 13） pass=44 failed=0
```

每个用例四个面：AST 逐节点 == tsc（kind / pos / end / text / name / isTypeOnly）、
默认态 XML == legacy（`EnableShellExpressions=false` + `EnableDeclarationShell=false`）、
不触发文件级 fallback、形状树无 `StatementShape` / `PossibleShape` / `CatalogGuide` 泄漏；
外加**迁移读数断言**：迁出族用例在终结候选路径上不许出现「首单元属迁出族」的 `ScanRoot` 调用
（按首单元文本归族，容器的壳——`{` / `if` / `switch` / `for`——不算，所以 `if (a) { return }`
不会因为外层的 if 壳而误报），对照组必须 > 0 次。

覆盖的 31 条迁出族形态：`return 1;` / `return;` / `return\nx;` / `return (x);` / `return`（EOF）/
`if (a) { return }` / `{ return }`；`throw new Error("x");` / `throw\na;` / `throw\n;`；
`break lbl;` / `break;` / `break\nlbl;`；`continue lbl;` / `continue\nlbl`；`debugger;` / `debugger\nx;`；
`;`（根）/ `{ ; }` / `if (a) ;` / `switch (a) { case 1: ; case 2: ; }`；
`let a = 1;` ⏎ `let b = 2;` / `let a = 1` ⏎ `let b = 2` / `let a = 1` ⏎ `if (x) y;` /
`const { a } = o;` ⏎ `foo();` / `var a`（EOF）/ `var a` ⏎ `var b`（EOF）/
`for (let i = 0; i < 2; i++) { b(); }`（**不该误判**）/ `let a: Foo<Bar>` ⏎ `let b = 1;`（gap-AS1 回归）/
`const enum E { A }`（**不该误判**，enum 声明候选）/ `let = 1;`（**不该误判**，`let` 是标识符）。

13 条对照：`if (a) { b(); }` / `if (a) b; else c;` / `while (a) { b(); }` / `for (;;) { c(); }` /
`try { … } catch (e) { … } finally { … }` / `switch (a) { case 1: g(); break; default: h(); }` /
`do { a(); } while (b);` / `with (a) { b(); }` / `lbl: for (;;) { break lbl; }` / `{ a(); b(); }` /
`if (a) return 1;` / `while (a) throw e;` / `switch (a) { case 1: return 1; }`。

**反事实（断言不空转）**：`node tmp/probe-counterfactual.mjs` 把
`StatementBoundaryUtil.IsShortFamilyCode` 中和成 `() => false`（= 终结候选退回 `ScanRoot`，等价迁移前），
同一支探针立刻变红，例如：

```
FAIL return-value  "return 1;"
     - 迁出族在终结候选路径上仍有 1 次 ScanRoot 调用（期望 0）
FAIL throw-call  "throw new Error(\"x\");"
     - 迁出族在终结候选路径上仍有 3 次 ScanRoot 调用（期望 0）
```

第二支反事实 `tmp/probe-counterfactual-coarse.mjs` 把族判定粗化成「首单元文本属于六族」——
专用探针**仍然 44/44**（读过：族判定的两处例外在当前语料里不可观测，见 §6-5），
这说明本轮的绿不是「随便怎么判都绿」，而是**族判定 + 收口判据这一对**在起作用。

### 3.3 判据为什么不是「把 `ScanRoot` 照抄改名」

- 族判定 `IsShortFamilyCode`：只回答「首单元是不是这六族」，与 `ScanRoot` 的分派条件**逐条对齐**
  （`const enum` 归还 enum 声明候选、单 `let` + 文档前瞻 `:` 归还标签语句）；
- 收口判据 `ShortFamilyEndCode` 按族分成四个函数，每个都是 `StatementScanner` 里那一条扫描规则的
  **逐字搬迁**（`ScanReturnOrThrow` / `ScanBreakOrContinue` / `ScanSimpleSemicolon` / `ScanToSemicolon`），
  底层读的仍是同一批谓词：`IsSemicolon` / `IsEof` / `EndsAtLineBreak`（唯一实现点在
  `StatementBoundaryUtil`）/ `NoLineBreakBetween` / `IsUncontinuableTailBoundary`，
  没有第二套 ASI、没有第二套角括号或类型判据；
- 入参是**只追加的增量前缀** `StatementEndScan.Code`（`Checked` 之前不重扫），`atEof` 显式传入，
  不读全局 `StatementScanner.AtEOF`（调用方在分派前刚算过同一个值，所以读的是同一个事实）。

## 4. 改动文件

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/statement-boundary-util.xl.md` | **+270 行**：新增 `IsShortFamilyCode`、`ShortFamilyEndCode`、`ReturnThrowEndCode`、`BreakContinueEndCode`、`SimpleSemicolonEndCode`、`VariableStatementEndCode`、`ScanToSemicolonIncremental`（七个静态方法 + 逐族文档） |
| `typescript/tokens/statements/statement-end-possible-shape.xl.md` | **+67/−12**：`ComputeByIndex` 在 `ScanRoot` 分支之前插入短语句族分派；`BuildByIndex` 的 EOF 分支与普通分支各插入同一分派；类文档 / 方法文档同步改写 |
| `tests/statement-possible/short-family-boundary.mjs` | **新增**（44 条用例 + 迁移读数断言 + 反事实可复现） |

`git diff --stat` 只有这两个 `.xl.md`；`build/ts` 与 `dist/ts` 是生成物（`xl_build` + `tsc` 重建，未手改）。
`tmp/probe-scanroot.mjs`、`tmp/probe-counterfactual.mjs`、`tmp/probe-counterfactual-coarse.mjs`、
`tmp/diag-guards.mjs`、`tmp/diag-short.mjs` 是**调查用探针，未入库**。

## 5. 默认全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑）

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
| `tests/statement-possible/short-family-boundary.mjs`（本次新增） | **44 / 44** |

与 Lead 给的基线读数**逐项相同**（零回归）。

## 6. 未迁族与风险（诚实清单）

1. **本轮明确未迁（允许）**：`if` / `while` / `do` / `for` / `try` / `switch` / `with` / 标签 /
   块 / 带体声明（`class` / `function` 体）/ 子句带体语句。它们仍在 `else` 分支读
   `ScanRoot` 的 `Status == 1 && End >= 0`（+ `DeclarationBodyEndCode` 兜底）。
   `with` 的 `(...)` 后体判界按任务书留给 5d-2b。
2. **空语句族本轮没有新增判据**：它已在 gap-SW §1 由 `EmptyStatementEndCode` 移出 `ScanRoot`
   （在族分派**之前**对所有族生效）。本轮只复核：探针 `empty` 的 `endPath = 0`（迁移前后都是 0），
   残余 2 次 `TryToClose` 是文件末尾未闭合容器壳的 EOF 兜底，与空语句无关。**没有为此改一行代码**。
3. **判据现在是两份实现**：`StatementScanner` 的四个扫描函数（legacy 根候选 / 块内原子建树仍在用）
   与 boundary 层的四个 `*EndCode`。这是「legacy 未退场」阶段的必然重复，一致性靠三条锁：
   逐字搬迁、默认全门（6171 + 1716 + 226 条语料里这些族大量出现）、专用探针的 AST+XML 对拍。
   **5d-2b / 后续 legacy 退场时，`StatementScanner` 那四个函数可以连同 `ScanRoot` 的对应分支一起删**，
   届时不要再维护两份。
4. **残余 ScanRoot 调用（不在本轮可改文件里，已如实计数）**：
   - `StatementShape.TryToClose`（`statement-shape.xl.md`，本轮禁改）：`var a` / `;` 结尾这类
     「文件末尾仍有未闭合壳」的 EOF 兜底，1~2 次/语料；该分支对 `ShellDeclarationFamily` 已改读
     `StatementEndCode`，对短语句族仍读 `ScanRoot`——**若要与本轮判据完全同源，需要 5d-1a 的成员**
     在 `TryToClose` 里加一条 `IsShortFamilyCode` 分支（本 Stage 无权改该文件）。
   - legacy `StatementPossibleShape`（`statement-possible-shape.xl.md`，不在允许清单）：
     关键字格 / EOF 哨兵格 / leftover 重放自己调一次，1~8 次/语料；与基线**逐位相同**。
5. **`let` 的两处例外是「防御性对齐」，不是眼下可观测的修复**（诚实说明）：`IsShortFamilyCode`
   照抄了 `ScanRoot` 的分派条件——`const enum …` 不算本族、单 `let` + 文档前瞻 `:` 不算本族。
   但实测（`tmp/diag-guards.mjs`）这三种形态**根本没有壳**：`let = 1;` / `let: 1;` 路由是
   `Legacy`（legacy 候选建树）、`const enum E { A }` 归 enum 声明候选，`IsShortFamilyCode`
   一次都不会被调用：

   ```
   "const enum E { A }"       IsShortFamilyCode calls=[]
   "let = 1;"                 IsShortFamilyCode calls=[]
   "let: 1;"                  IsShortFamilyCode calls=[]
   "let a = 1;"               IsShortFamilyCode calls=[let a = | let a = 1]
   "var c"                    IsShortFamilyCode calls=[]          # 末 token 由 TryToClose 兜底
   ```

   第二支反事实（`tmp/probe-counterfactual-coarse.mjs`）把族判定粗化成「首单元文本属于六族」，
   专用探针**仍然 44/44 全绿**——所以 `const-enum-guard` / `let-as-identifier` 这两条用例锁的是
   AST/XML（它们走 legacy 路径），**并不**锁住这两处例外。保留它们的原因是：一旦将来有新的建壳方
   （子句壳 / 块体壳 / 新的族）把这种首单元做成壳，粗化的族判定会把 `let: 1` 当变量声明（壳永不收口、
   与标签语句争族）、把 `const enum` 当变量声明（与 enum 声明候选争族）。所以这两行是**把
   `ScanRoot` 的分派条件搬全**，而不是当下能测出来的收益。
6. **`atEof` 的语义必须与调用方一致**：`ShortFamilyEndCode` 收的是显式 `atEof`，两个调用点都在
   调用前刚算过 `StatementScanner.AtEOF`（与基线 `ScanRoot` 读同一个值）。将来若在别处调用，
   必须传同一个事实，否则变量声明族的「文件末尾不收口」会分叉。

## 7. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d1b

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序）
#   xl_build 工具：cwd=本目录，paths=["core","typescript"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 专用探针（入库，44/44）
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/short-family-boundary.mjs --verbose

# 逐族 ScanRoot 计数（tmp，不入库；需先用 write 工具重建，内容见 §3.1 的读数方法）
node tmp/probe-scanroot.mjs
node tmp/probe-scanroot.mjs --trace

# 反事实（证明迁移读数敏感）
node tmp/probe-counterfactual.mjs

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
git revert <本轮的 commit>      # 源码 + 专用探针一起回退（单提交）
# build/ts、dist/ts 是生成物：回退后重新 xl_build + tsc 即可
```

只想**软退**短语句族这一层（保留探针、不重编）：把 `StatementBoundaryUtil.IsShortFamilyCode`
临时中和成 `() => false` 即回到迁移前行为（`tmp/probe-counterfactual.mjs` 的做法，
等价于终结候选退回 `ScanRoot`）。
