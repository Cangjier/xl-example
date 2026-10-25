# HANDOFF gap-SW：switch 空子句 / 嵌套内层 / 块内 class 后语句 / 子句内函数体

分支 `feature/possible-statement-gap-sw`，基线 `a03df655`。本轮只动 3 个 `.xl.md`（`typescript/tokens/statements/`）
与 3 个测试文件，开关一个都没改：`EnableShellExpressions` / `EnableBlockBodyCatalog` /
`EnableSwitchCaseClause` / `EnableBlockClassShell`（以及 `EnableDeclarationShell`、
`EnableSwitchCaseBody`、`EnableBlockFunctionBody`）全保持原默认，`core/**`、
`IsAsiBoundary` 函数体、`dist/**`、`build/**` 均未手改（`dist` 由 `xl_build`、`build` 由 `tsc` 产出）。

## 1. 结论先行

四条全部达标，且都不是靠文件级 fallback 兜出来的：

| # | 形态 | 前 | 后 |
|---|---|---|---|
| 1 | `switch (x) {\n case 1: ;\n case 2: ;\n}` | `SwitchCaseClauseShellCount=1`、`LastFileFallback=true`、`FileFallbackCount+1` | `SwitchCaseClauseShellCount=2`、`LastFileFallback=false`、`FileFallbackCount+0`，XML == legacy，AST == TS |
| 2 | `switch (x) {\n case 1: switch (y) {\n case 2: f();\n }\n}` | `SwitchCaseClauseShellCount=1`、`SwitchCaseClauseMountCount=1`（内层子句不接管） | `SwitchCaseClauseShellCount=2`、`SwitchCaseClauseMountCount=2`（内层子句也建壳） |
| 3 | `{\n class C {}\n f();\n}` | `BlockBodyStatementCount=0`（class 壳被拆、`f();` 没回到块体目录） | `BlockBodyStatementCount=2`（class 壳 + `f();` 都经收集通道） |
| 4 | `switch (x) {\n case 1: function f() { g(); }\n}` | `BlockFunctionBodyMountCount=0`、`BlockBodyStatementCount=0` | `BlockFunctionBodyMountCount=1`、`BlockBodyStatementCount=1` |

前读数的取法：把本轮 3 个 `.xl.md` `git stash` 掉 → `xl_build` + `tsc` 回到基线产物 → 同一份探针再跑一遍
（`tmp/probe-sw.mjs`）；后读数在同一分支的最终产物上取。四条形态的 XML 在前后都等于 legacy 路径（关掉
`EnableShellExpressions` 的同一棵树），AST 与 `ts.createSourceFile` 逐节点相同（探针里现算，不是引用旧结论）。

## 2. 四条根因与前后读数

### 2.1 空子句（`case 1: ;`）→ 文件级 fallback

**根因**：子句壳是**在 `;` 这一格**建出来的（`CaseClauseStatementPossibleShape.BuildByIndex` 把 `;` 搬进壳挂成
`host.MountedUnit`），而终结候选只在**新单元流入**时被求值。于是这个 `;` 从来没有当过「末代码单元」：
表达式族（`ShellPlainExpression`）的判界 `StatementBoundaryUtil.StatementEndCode` 只看末代码单元，
对「首单元 `;`、末单元 `case`」答 `-1`，壳继续吞下一条子句 `case 2: ;`，到 case 块 `}` 时
`BuildFromShell` 读到两条语句 → 抛 `语句没有读完` → 整条文件走 **文件级 fallback**（树对、接管账全错）。
单条 `case 1: ;` 之所以看着正常，只是因为它靠 `ExitOrPre` 在 `}` 前收口。

**修法**：`StatementEndPossibleShape.EmptyStatementEndCode(units, codeAt)`——首代码单元是 `;` 就返回它的下标。
这不是新判据：`StatementScanner.ScanRoot` 对首单元 `;` 本来就答 `Complete(0)`（`statement-scanner.xl.md:182-187`），
这里只把**同一条事实**提到族分派之前，让表达式族 / 声明族也读得到。`ComputeByIndex` 与 `BuildByIndex`
（含 EOF 分支）**同一份**判据：收口位置必须两处同数，否则消费到别的下标还是「语句没有读完」。

**前后**：`shell 1 → 2`、`mount 1 → 1`、`body 0 → 0`、`fallback 1 → 0`、`LastFileFallback true → false`。

### 2.2 嵌套 switch 的内层子句不接管

**根因**：`CaseClauseStatementPossibleShape.IsStatementFamilyHead` 把 `switch` 排除在「带体关键字族」之外
（Stage 4ae 的保守取舍），于是 `case 1: switch (y) { … }` 的子句壳挂了 `ShellPlainExpression` 族标记；
`BlockPossibleShape.IsSwitchKeywordShell` 要求 `Kind === ShellStatementFamily`，条件不成立，**内层 case 块括号
拿不到子句目录**，内层 `case 2: f();` 只能留 raw。同一处还有个副作用：表达式族判界对 `switch` 的 `}` 边界
本来就答不出来。

**修法**：`switch` 进 `IsStatementFamilyHead`。外层子句壳 `Kind = ShellStatementFamily` 且首代码单元是
`switch` → `IsSwitchKeywordShell` 成立 → 内层 case 块括号挂 `[CaseClauseStatementPossibleShape]` 目录 →
内层子句建壳。判界走 `ScanRoot` 的 `ScanLoop`（`switch` 与 `while` 同一条），内层 `}` 一闭合外层壳即收口，
不多吞单元。

**前后**：`shell 1 → 2`、`mount 1 → 2`、`body 0 → 0`、`fallback 0 → 0`；`case 1: switch (y) { case 2: a; case 3: b; }`
为 `shell 3 / mount 2`。

### 2.3 块内 class 之后的语句没被块体目录接管

**根因**：`class` 走 `EnableBlockClassShell` 判成 `ShellStatementFamily`，但它的收口判据是
`StatementScanner.ScanRoot`，而 `ScanRoot` **不认声明起点**（`class` / `function` 是 legacy 声明族的起点，
`statement-scanner.xl.md:167-311`）。于是 `class C {}` 的壳永远等不到「体括号已闭合」：到块 `}`
时 `BuildFromShell` 读到 `class C {} f()` 两条语句 → `DetachShell` 退回 raw → 树仍对，但
`f();` 这一格**从没回到块体目录**（`LeftoverReplayCount=0`），`BlockBodyStatementCount=0`。

**修法**：`StatementEndPossibleShape.DeclarationBodyEndCode(code)`——首代码单元是 `class` / `function` 时用
`StatementScanner.ScanDeclarationBody` 找本层第一个闭合 `{…}` 体括号（`ScanBody` 对 `function` / `class`
本来就走这一份）。`StatementEndPossibleShape` 只在 `ScanRoot` 给不出 `End` 时读它，`ScanRoot` 与 legacy 根路径
**一字未改**（否则 legacy 的 `class` 候选会与声明候选同格 Accept）。壳在体括号处收口后，
`StatementShape.FinishShell` 的既有尾巴重放把 `f();` 送回块体目录。

**前后**：`body 0 → 2`（class 壳 + `f();`；两条都经 `CollectBodyStatements`）、`fallback 0 → 0`；
s4y 探针的 `CLASS-FLAG` 行 `{ class C {} f(); }` 由 `body=0` 变 `body=2`（并升级为断言）。

### 2.4 子句内函数声明体不接管

**根因**：`case 1: function f() { g(); }` 的子句语句是带体族，函数体 `{` 的宿主是**子句壳**（不是括号）。
块内函数声明体走的是 `OnChildBracketCreated` 的 `IsFunctionDeclarationBody(parent, bracket)` 分支，
它要求 `parent instanceof Bracket`；子句壳不是括号，`OnShellBracketCreated` 又只转调
`TryMountControlFlowBody`（只认 `if` / `while` / `do` / `for` / `with` / `try`），于是函数体括号**一个目录都没挂上**：
`BlockFunctionBodyMountCount=0`，`g();` 留 raw。

**修法**：`BlockPossibleShape.OnShellBracketCreated` 在 `TryMountControlFlowBody` 不成立后，用**同一份**
`IsFunctionDeclarationBody`（它只读 `host.Data`，对壳同样成立）判一次函数声明体，挂的是函数体 `{` 自己
（`MountBodyCatalog(bracket)`），门控沿用 `EnableBlockFunctionBody`。建树路径不新增：仍是
`BuildBlock()` → `HasBuiltBodyStatements` / `CollectBodyStatements`。

**前后**：`fnBody 0 → 1`、`body 0 → 1`、`shell 1 → 1`、`mount 1 → 1`、`fallback 0 → 0`。

## 3. 改动文件

源码（3 个 `.xl.md`，UTF-8 无 BOM / LF）：

- `typescript/tokens/statements/statement-end-possible-shape.xl.md`
  - 新增 `EmptyStatementEndCode`（§2.1）与 `DeclarationBodyEndCode`（§2.3/§2.4）；
  - `ComputeByIndex`：族分派前读空语句壳；非表达式族在 `ScanRoot` 无 `End` 时读声明体判据；
  - `BuildByIndex`：非 EOF 分支与 EOF 分支都读同一对判据（收口位置与「接受」同数）；
  - 新增 `Common` 依赖 import。
- `typescript/tokens/statements/case-clause-statement-possible-shape.xl.md`
  - `IsStatementFamilyHead` 加入 `switch`（§2.2），并把「Stage 4ae 的保守取舍 / 留待后续」改写成闭合后的判据与读数。
- `typescript/tokens/statements/block-possible-shape.xl.md`
  - `OnShellBracketCreated` 增加声明体分支（§2.4）；`switch` 分支与 `TryMountControlFlowBody` 调用保持原样。

测试（`tests/statement-possible/**`）：

- 新增 `s4ag-sw-takeover.mjs`：9 条断言的专用探针，每条都比 **XML == legacy**、**AST 逐节点 == `ts.createSourceFile`**、
  `LastFileFallback=false` / `FileFallbackCount+0`，并断言 shell / mount / body / fnBody 四个增量。
- `case-clause-cases.json` 新增分组 `stage4agsw`（16 条，含 3 条 trap：`;`、`{ class C {} }`、根层 `class C {} f();`）。
- `s4y-case-clause-takeover.mjs`：嵌套 switch 的期望改为 `mount=2 / shell=2`（新增可选 `mount` 字段）；
  `CLASS-FLAG` 段由「只打印」升级为「断言 body」（`{ class C {} f(); }` = 2）。

`tmp/probe-sw.mjs`、`tmp/probe-err*.mjs`、`tmp/probe-trace.mjs`、`tmp/probe-end.mjs`、`tmp/probe-block.mjs`、
`tmp/probe-decl.mjs` 是阶段探针，**不提交**（`tmp/` 未进 commit）。

## 4. 默认全门读数（最终产物上实跑）

| 门 | 读数 |
|---|---|
| `ast-json` | `6171 / 6171`（47 个构造） |
| `ast-json-diff` | `6171 / 6171` 完全一致；结构差 0 / 位置差 0 / 字段差 0 |
| `git status typescript/cases` | 空（测完 `git checkout -- typescript/cases`） |
| `token-ast` | `total=1716 ok=1706 crash=0 diff=0 ts-invalid=10` |
| `real-dts` | `226 / 226`，崩溃 0 |
| `harness --all` | `cases pass=101 fail=0 skip=0 known=1 uncovered=0`，`double-accept 冲突 0`，`file-fallback 0` |
| `harness --double-accept` | `cases=120 failed=0` |
| `declaration-statement-takeover` | `cases=33 pass=33 knownGap=0` |
| `tests/parse/validate` | `1720 条用例，0 条不合格` |
| `final-matrix` | `cases=38 shapeAst=38/38 xmlEqLegacy=38/38 astEqTS=38/38 knownGap=1` |

本轮相关探针与新增用例（都在最终产物上跑）：

| 目标 | 读数 |
|---|---|
| `tests/statement-possible/s4ag-sw-takeover.mjs`（新增） | 9 / 9 PASS |
| `harness --file=case-clause-cases.json --group=stage4y,stage4aa,stage4ae` | 41 / 41 |
| `harness --file=case-clause-cases.json --group=stage4agsw`（新增） | 16 / 16 |
| `harness --file=switch-case-cases.json --group=stage4p,stage4s,stage4w` | 60 / 60 |
| `harness --file=block-body-cases.json --group=stage4b` | 17 / 17 |
| `harness --file=control-flow-body-cases.json --group=stage4n` | 28 / 28 |
| `harness --file=control-flow-cases.json --group=stage4c` | 42 / 42 |
| `harness --file=block-cases.json --group=stage4-block` | 12 / 12 |
| `s4y-case-clause-takeover.mjs`（更新） | ALL PASS（含 `CLASS-FLAG body=2 :: { class C {} f(); }`） |
| `block-body-takeover.mjs` | `cases=21 failed=0` |

## 5. 未绿与风险

1. **`tests/statement-possible/control-flow-body-takeover.mjs` 有 2 条红，是基线红，不是本轮引入**：
   `{ enum E { A } }` 与 `{ declare const x: number; }` 的期望是 `BlockBodyStatementCount 增量=0`，实测 `=1`。
   结论来自**两次实跑**（`git stash` 回到基线的产物上一次、最终产物上一次）：`cases=46 failed=2 defaultFlags=true
   totalBrace=34 totalBody=64` 两次逐字相同，失败的两条用例也相同。根因是本分支基线
   `a03df655`（声明族壳转正）之后这两条已经被接管，而该探针的期望没跟着更新；与本轮三处改动无关（本轮改动
   不参与 `enum` / `declare` 的收口：`DeclarationBodyEndCode` 只认 `class` / `function` 首单元，`EmptyStatementEndCode`
   只认首单元 `;`）。**本阶段没有顺手改这两条期望**：它们属于声明壳转正的收尾，改期望会让一条基线红静默变绿，
   留给出声明壳那一批的成员连同读数一起更新。
2. **`tests/gates/run.mjs` 的 `coverage` 门在基线上就是红的**：`tests/parse/ts-shape.mjs` 需要
   `build/ts/typescript/print-ast-common.js`，而本基线（主仓库与本成员目录都一样）没有这个产物
   （`build/ts/typescript/` 只有 `ast` / `run` / `tokens`）。同一原因 `cases:tsast` 也跑不起来。
   这不在 Lead 给的默认全门清单里，本轮**没有**改动它，也没有绕开。
3. **`on` 路径仍依赖文件级 fallback 作为最后兜底**（`EnableFileFallback` 未关）：本轮四条形态都在
   `fallback=0` 下建成，但兜底机制本身照旧存在，契约没有变化。
4. **`switch` 进带体族后壳计数会变**：凡「子句语句以 `switch` 开头」的形态都从 `shell=1` 变成 `shell=2`
   （内层子句也算一条）。这是本轮的**目标**，但它确实改了一条既有读数——`s4y-case-clause-takeover.mjs` 的那条期望
   已随之更新，仓库里若有别的脚本硬编码 `switch (x) { case 1: switch …` 的 `shell=1`，需要同步。
5. **`class` / `function` 的声明体判据只覆盖这两个首单元**：`async function` 不在
   `IsStatementFamilyHead` 里（子句语句以 `async` 开头仍走表达式族，属未接管而非建错），`interface` / `enum`
   的体仍由 legacy 递归建。本轮没有扩大这个集合，避免牵动声明族的边界口径。

## 6. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-gap-sw

# 构建（.xl.md → dist → build）
#   1) xl_build 工具：cwd=上述目录，paths=["core","typescript"]（或只 ["typescript/tokens/statements"]），targets=["ts"]
#   2) 编译
node node_modules/typescript/bin/tsc -p tsconfig.json   # 必须 exit 0

# 四条的专用证据（含 AST==TS / XML==legacy / 无 fallback 断言）
node tests/statement-possible/s4ag-sw-takeover.mjs

# 本轮新增用例组
node tests/statement-possible/harness.mjs --file=tests/statement-possible/case-clause-cases.json --group=stage4agsw

# 阶段探针（不提交）
node tmp/probe-sw.mjs

# 默认全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
git checkout -- typescript/cases
node typescript/cases/token-ast.mjs
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
```

回退（两条三处，都是纯源码回退，不碰开关默认值）：

```powershell
git checkout -- typescript/tokens/statements/statement-end-possible-shape.xl.md `
                typescript/tokens/statements/case-clause-statement-possible-shape.xl.md `
                typescript/tokens/statements/block-possible-shape.xl.md
node node_modules/typescript/bin/tsc -p tsconfig.json
```

三条改动彼此独立，可以单退：只退 `statement-end-possible-shape.xl.md` 回到 §2.1+§2.3 未修（空子句重新 fallback、
块内 class 后语句不接管），只退 `case-clause-…` 回到 §2.2 未修（嵌套 switch 内层不接管），只退
`block-possible-shape.xl.md` 回到 §2.4 未修（子句内函数体不接管）。四条形态各自都有专用断言，
任何一条回退都会让 `s4ag-sw-takeover.mjs` 立刻红在该条上，不会静默。
