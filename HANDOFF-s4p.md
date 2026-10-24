# HANDOFF — Stage 4p（switch 体 / case 块 + 块内函数声明 + 箭头/对象体内控制流嵌套）

分支 `feature/possible-statement-s4p`，基线 `feature/possible-statement` @ `877f7e93`。

## 0. 完成度（不伪造绿）

| 目标 | 状态 | 证据 |
| --- | --- | --- |
| 1. switch 体 / case 块接管 | **未交付：尝试后安全回退**（`EnableSwitchCaseBody = false`） | 挂 case 体 `{` 后 `case <表达式>:` 抛 `SourceRange is not set` → 文件级 fallback；mount / no-mount 对照见 §1。XML/AST 仍由 legacy 建对（`stage4p` 25 条全绿、fallback 0） |
| 2. 块内函数声明 | **未交付：挂上但没接管**（`EnableBlockFunctionBody = false`） | `BlockFunctionBodyMountCount` 增 1，但 `BlockBodyStatementCount` 增量 **0**（体内语句没被 `BuildBlock()` 的收集通道收到）；默认关，见 §2 |
| 3. 箭头 / 对象体内控制流嵌套 | **确认（同一机制可达，无新代码）** | `s4p-arrow-ctrl-nested` / `s4p-obj-ctrl-nested`（body/brace 计数与 4o/4n 基线一致） |
| 4. 声明族 / import-export | **未触碰**（并行成员负责根层） | 未改任何声明族 / 导入导出候选与判据；`git diff --stat core/` 为空 |
| 5. 专用 cases | **完成** | `tests/statement-possible/switch-case-cases.json`（组 `stage4p`，25 条）+ 4p 计数用例（含两条「不接管」证据） |
| 6. 集成收敛 | 见 §6 读数（全表绿） | |

core 改动：**无**。改动集中在 `typescript/tokens/statements/block-possible-shape.xl.md`（两个挂载分支 + 两个计数 +
两个默认关的开关 + 判据）与测试；`dist/` 由 `xl_build` 重生成（不手改）。

## 1. switch 体 / case 块：做过什么、为什么回退

### 结论

switch 的**体括号**一律不挂；**case 子句里的体 `{`** 实现并实测了挂载，但打开后建树抛错、整条文件走文件级
fallback，因此**默认关**（`BlockPossibleShape.EnableSwitchCaseBody = false`），case 体保持 raw、由
`BuildCaseBlock` 的 legacy 递归建树 —— **未接管，但树与 legacy 逐字节一致**。

### 为什么 switch 的体括号不能挂

`switch (x) { … }` 的体括号是 `CaseBlockShape` 的入口，里面是 `case` / `default` **子句**而不是语句，
`StatementBuilder.BuildCaseBlock` 自己按 `case` / `default` 关键字切段。把块体目录挂上去时：

- `StatementRouteUtil.Decide("case")` 返回 `ShellPlainExpression`（`case` 既不在 `IsLegacyKeyword`、
  也不在 `IsControlFlowHead` 里），目录里的表达式候选会把 `case 1:` 当表达式语句起点建壳；
- `BuildCaseBlock` 随后再也看不到 `case` / `default` 关键字（单元已被形状顶替），只能抛错。

所以 `TryMountControlFlowBody` 对 `switch` 的排除保持原样；`SwitchCaseBodyMountCount`（只数 case 体）与
`ControlFlowBodyBraceCount`（只数控制流体）分开计量。

### case 体的判据

`BlockPossibleShape.IsSwitchCaseBody`（三段，全部只读已有树）：`{` 前一个非 trivia 单元是 `:`；
宿主括号的父单元是控制流壳（`Kind === ShellStatementFamily`）；壳首代码单元是 `switch`。
挂载后建树仍走 `BuildCaseBlock` → 内层 `BuildStatement()` → `BuildBlock()` →
`HasBuiltBodyStatements` / `CollectBodyStatements`，`CaseBlockShape` / `CaseClauseShape` 一个字没改。

### 实测（`EnableFileFallback = false`，mount / no-mount 对照）

| 源码 | `EnableSwitchCaseBody = true` | `= false`（默认） |
| --- | --- | --- |
| `switch (x) { default: { let y = 2; } }` | **OK**（SwitchCaseBodyMountCount=1、fallback 0） | OK |
| `switch (x) { case 1: { let y = 1; } }` | **THROW `SourceRange is not set`** | OK |
| `switch (x) { case a: { g; } }` | **THROW `SourceRange is not set`** | OK |
| `switch (x) { case 1: {} }` | **THROW `不支持的表达式起点`**（ExpressionBuilder.ParsePrimary） | OK |
| `switch (x) { case 1: { g; } }` | **THROW `SourceRange is not set`** | OK |
| `switch (x) { case 1: { if (a) { b; } } }` | **THROW `SourceRange is not set`** | OK |

即：`default:` 子句能接管，`case <表达式>:` 一律炸；错误发生在**子句表达式**的建树路径
（`case 1: {}` 空体也在 `ParsePrimary` 抛，说明与体内语句无关），抛错后被 `SourceFileRunner.Parse`
的文件级 fallback 接住、整条文件重解析。fallback 计数非 0 不是可交付状态 → 默认关。

### 下一步线索（未做完）

1. 复现面已缩到「`case` 子句表达式 + case 体括号上有目录」：`default:` 无表达式 → 正常；
   `case 1: {}` 空体 → `ParsePrimary` 抛。怀疑 `BuildCaseBlock` 的
   `inner.BuildExpressionRange(inner.At, colonAt - 1)` 在宿主 `Data` 里含有「挂了目录的括号」之后，
   取到了位置 / 下标口径不一致的单元（`inner.Positions` 与 `Units` 的对应）。
2. 下一轮应先把「case 表达式」与「case 体」分开验证（先不挂目录、只加断言），再决定是否给
   `BuildCaseBlock` 加**子句级收集分支**（已建 `StatementShape` 按序 `clause.Add` + raw 段内层
   `BuildStatement`），而不是只挂体括号。
3. 开关与判据都已留在代码里（`EnableSwitchCaseBody` / `IsSwitchCaseBody` / `MountBodyCatalog`），
   打开即可复现上表，不需要重写。

## 2. 块内函数声明：挂上了，但没有接管（默认关）

`{ function f(){ let x = 1; } f(); }` 的实现：

1. 体括号 `{` 创建时（父单元是块体括号 → `Bracket.ChildBracketCreatedHook` →
   `BlockPossibleShape.OnChildBracketCreated`）用 `IsFunctionDeclarationBody` 认出「这是函数声明的体」；
2. 挂块体语句目录（`MountBodyCatalog`），`BlockFunctionBodyMountCount` 只增；
3. 声明本身**不壳化**：仍留 raw，由 legacy 递归 `BuildStatement()` → `BuildFunctionDeclaration` 建。

判据（`IsFunctionDeclarationBody`）：从体 `{` 往回扫，过返回类型（到参数表 `(` 为止）、参数表那个
**已闭合的 `(`**（`IsClosedParameterList`）、可选类型参数 `<…>`、可选 `*`、函数名，再往前一格必须是
`function`；扫到 `;` / `=` / `=>` / `,` 立即停。只确认「前面是闭合 `(`」不够：`m(){…}`（对象方法）、
`constructor(){…}`（构造器）同样满足那一格，会挂错目录（形状泄漏），`function` 那一格就是区分点。

### 实测结论：mount 1、body 0 —— 挂载不等于接管

`node` 直接读计数（`EnableFileFallback = false`）：

- `{ function f() { let x = 1; } }` → `BlockFunctionBodyMountCount` **+1**、`BlockBodyStatementCount` **+0**、
  `fallback = 0`；XML / AST 与 legacy 一致（`stage4p` 用例全绿）。
- 同一条源码在 takeover 用例里也证实：`brace=0 body=0 cf=0`（见 §5 的 4p 证据组）。

也就是说：目录挂上了、体内 `let x = 1` 也在解析期被建成了形状，但 `BuildFunctionDeclaration` →
`BuildBlock()` 的 `HasBuiltBodyStatements(bracket)` 在**块内声明**这条路径上没有走到收集（根层 4j 的
函数体是同一份 `BuildBlock`，实测 body 正常；差异在「声明本身是 raw、由外层块的 raw 段递归建」这条入口）。
没有接管就不算交付，所以默认关（`EnableBlockFunctionBody = false`）：行为逐位回到 Stage 4o
（体内语句由 legacy 递归建，树与 legacy 逐字节一致）。

### 下一步线索

1. 在 `BuildFunctionDeclaration` 里确认块内声明的体是不是走了 `BuildBlock()`（还是另有一条
   「按 raw 单元重建体」的入口）；若是后者，`HasBuiltBodyStatements` 永远不会被问到。
2. 也可能是「体括号在外层块 raw 段被 `Load` 时，形状已被搬走 / 重新包了一层」。建议先打印
   `HasBuiltBodyStatements(bodyBracket)` 的返回值与 `bodyBracket.Data` 的单元类型序列定位。
3. 声明壳化（`function` 作为块内声明族候选）是另一条路，但要先确认 `StatementScanner.ScanRoot`
   在块内声明上的结束位置口径，且与并行成员的根层声明工作**同判据**，本轮按纪律不碰。

## 3. 箭头 / 对象体内控制流嵌套：确认可达（无新代码）

`const f = () => { if (a) { b; } };`：`=>` 后的 `{` 由 4o 的箭头分支挂目录 → `if` 由
`ControlFlowStatementPossibleShape` 建壳 → `StatementShape.OnBracketCreatedEvent` →
`TryMountControlFlowBody`（壳 `Kind === ShellStatementFamily`、首单元 `if`、`{` 前是闭合 `(` 且再往前是
`if`）→ if 体挂目录 → `b;` 被收集。对象方法体同理（`const o = { m(){ while (a) { b; } } };`）。
本轮改动只**新增**两个分支（默认都关）与两个计数，未改任何既有判据的顺序或内容，所以这两条形态走 4o/4n 原路。

## 4. 声明族 / import-export

**未触碰**。`StatementRouteUtil.IsLegacyKeyword`、`StatementPossibleShape`、导入导出候选、根层声明族判据
全部未改；本分支只影响「已经在 raw 段里的声明体括号」是否挂目录（且两个开关默认关），不影响「谁来建这条声明」。
与并行成员的根层声明 / 导入导出工作没有同文件、同判据冲突（`git diff --stat core/` 为空）。

## 5. 专用 cases

- `tests/statement-possible/switch-case-cases.json`（组 `stage4p`，25 条）：switch case 体 10 条（单块、
  子句语句 + 块、default、体内控制流、嵌套 switch、两个 case 块、无分号、块内 switch、空块、混合语句）——
  **XML/AST 门**；块内函数声明 7 条（简单、两句、返回类型、泛型、函数内嵌套、if 体内、case 体内）——
  **mount 证据 + XML/AST 门**；箭头 / 对象嵌套 2 条；**冒名组 6 条**（switch 无 case 体、嵌套类型字面量、
  无方法对象字面量、对象方法、标签体、类方法）。每条都断言：XML == legacy 逐字节、AST == TS 逐节点、
  两次解析 XML 相同、无 `StatementShape` / `PossibleShape` / `CatalogGuide` 泄漏、**无文件级 fallback**。
- 4p 计数用例追加在 `tests/statement-possible/control-flow-body-takeover.mjs`：
  `brace` = `ControlFlowBodyBraceCount`、`body` = `BlockBodyStatementCount`、`cf` = `ControlFlowShellCount`。
  四条 switch 钉住「switch 体括号与 case 体 `{` 都不挂」（brace 0 / body 0），
  `{ function f() { let x = 1; } }` 钉住「挂上但没收集」（body 0）——都是**回退的证据**，不是接管的证据。

## 6. 读数

xl_build（工具）：`block-possible-shape.xl.md` 单文件重生成 0 error；全表构建 890 written / 0 error（warning 与基线同量级）。

| 步骤 | 读数（退出码 + 末几行） |
| --- | --- |
| `tsc` | exit=0 ::  |
| `harness-all` | exit=0 :: [statement-possible] groups run=8 skipped=3 / cases pass=101 fail=0 skip=0 known=1 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `double-accept` | exit=0 :: [statement-possible] double-accept 冲突: 0 ; [statement-possible] double-accept: cases=120 failed=0 |
| `lint` | exit=0 :: [lint] OperatorTable 数字优先级条目=12 ; [lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） |
| `stage4p` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=25 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `cf-body-takeover` | exit=0 :: PASS "{ function f() { let x = 1; } }"  brace=0 body=0 cf=0 ; [control-flow-body-takeover] cases=31 failed=0 defaultFlags=true totalBrace=33 totalBody=41 |
| `stage4n` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=28 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `stage4o` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=27 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `cf-takeover` | exit=0 :: PASS "en /* c */ : a;"  cf=0 body=0 label=1 ; [control-flow-takeover] cases=39 failed=0 defaultFlag=true |
| `block-body-takeover` | exit=0 :: PASS "{ a; if (b) c; d; }"  shells=1 body=3 ; [block-body-takeover] cases=21 failed=0 defaultFlag=true |
| `s4j-function-body` | exit=0 :: / `({ m(){ let z=1; } });` / 1 / 1 / 0 / PASS / ; / `function f(): void;` / 0 / 0 / 0 / PASS / |
| `s4l-await-body` | exit=0 :: / `function s(){ await f(); }` / 1 / 1 / 1 / PASS / ; / `async function u(){ await a + b; let z=1; }` / 1 / 0 / 1 / PASS / |
| `r1-asi` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=31 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `stage5c` | exit=0 :: [statement-possible] groups run=0 skipped=1 / cases pass=0 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `stage4b` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=17 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `stage4c` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=42 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `stage4c2` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=33 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `dev` | exit=0 :: [statement-possible] file-fallback total=2 distinct=1 ;   fallback: "let a = 1; a++; --\na;\nif (a) { a++; } --\na;" |
| `operators-live` | exit=0 :: [statement-possible] groups run=1 skipped=0 / cases pass=40 fail=0 skip=0 known=0 uncovered=0 ; [statement-possible] file-fallback total=0 distinct=0 |
| `op-ast-proof` | exit=0 :: PASS  s3m-declined-async-arrow-type  shapeAst=0 declined=1 texts=["params"] ; [op-ast-proof] group=ast-from-shapes cases=90 pass=90 fail=0 / 形状树接管计数已核 90 条、TS 逐节点已核 85 条、AST 数字叶子已核 8 条 |
| `op-proof` | exit=0 :: PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1 ; [op-proof] group=operators-live cases=40 pass=40 fail=0 / 结构文本已核 40 条、InsertBetween 计数已核 38 条 |
| `comma-import-fallback` | exit=0 ::       shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=["call(import)"] ; [comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管） |
| `validate` | exit=0 :: 1720 条用例，0 条不合格 |
| `ast-json` | exit=0 :: [using-declarations] cases=29 cj-ok=29 cj-fail=0 ; total cases=6167 cj-ok=6167 cj-fail=0（47 个构造） |
| `ast-json-git-status` | clean (empty) |
| `ast-json-diff` | exit=0 :: （没有 gap） ; 合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条 |
| `token-ast` | exit=0 :: known-gap:     0 file(s) (none) ; non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10) |
| `real-dts` | exit=0 :: real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0 ; 真实 .d.ts 全量解析成功且 AST 逐节点一致 |
| `feas-operator` | exit=0 :: [feas-operator] cases=6 pass=6 fail=0 |
| `insert-between` | exit=0 :: PASS  拒绝非法输入 ; [feas-operator] insert-between tests=9 pass=9 fail=0 |
| `perf` | exit=0 :: [perf] WARN 耗时增长超过 2.5 倍，疑似二次退化（设计 §8.3.3） ; [perf] done |


## 7. 未覆盖 / 剩余

1. **switch case 体接管**：未交付（§1）。开关默认关；`IsSwitchCaseBody` / `MountBodyCatalog` /
   `SwitchCaseBodyMountCount` 已就位，打开即复现抛错表。
2. **case 子句级语句**（`case 1: f();` 不带 `{}`）：仍 raw。即使 case 体接管修好，这类语句还需要
   `BuildCaseBlock` 的子句级收集分支。
3. **块内函数声明的体接管**：未交付（§2）。mount 通道已就位、默认关；缺的是「块内声明 → `BuildBlock` →
   收集」这一步的真相。
4. **声明族本身**（块内 `function` 的壳化、`declare function`、重载签名、`class` / `enum` / `interface`
   在块内）：未做，属并行成员范围或后续轮。
5. **`{ function f(): void; function f(){} }` 这类重载**：体挂载未专门验证；不挂 = 未接管（树仍对）。

## 8. 风险

- **两个开关都必须保持默认 `false`**：它们是「实验入口」，不是「半成品可用状态」。`EnableSwitchCaseBody`
  打开 → 文件级 fallback；`EnableBlockFunctionBody` 打开 → 只多一个挂载计数（不改变树，但会让
  「mount 即接管」的误读有市场）。`stage4p` 与 4p 计数组同时钉住这两点，改动不会被静默吞掉。
- **case 体的树依赖「raw 括号」**：`BuildCaseBlock` 会读到 case 体括号的 `Data`；默认关时它仍是纯 raw，
  与 4o 基线一致。
- **两个新计数分开计量**（`SwitchCaseBodyMountCount` / `BlockFunctionBodyMountCount`）是刻意的：
  「挂载」与「收集」是两件事，本轮正好各有一个反例，混在一起就看不出来。
- **`IsFunctionDeclarationBody` 依赖「参数表是一个已闭合的括号单元」**：与本语法 `(` `)` 同体的口径一致；
  若括号改成两个单元，要与 `TryMountFunctionBody` 一起改。
- **perf 只有 WARN 级输出**（基线同样存在），本轮未做性能断言。