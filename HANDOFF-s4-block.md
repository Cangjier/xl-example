# HANDOFF — s4-block（Stage 4a：块语句壳化 + 块体目录基础设施）

STATUS: DONE（最小可行子集，全表绿）+ 明确剩余（见 §6）
BRANCH: feature/possible-statement-s4-block
BASE: 76d6902f（feature/possible-statement）
代码基线开关：StatementRouteUtil.EnableShellExpressions = true 默认；EnableBlockBodyCatalog = false 默认。

## 1. 完成度一句话

块语句 `{ ... }` 已经**由语句壳认领**（`StatementRoute.ShellBlock` → `BlockPossibleShape` →
`StatementShape` 壳，`Kind = ShellBlock`、`BodyKind = BodyKindBlock`），块内语句**本阶段仍由
legacy `StatementBuilder.BuildBlock()` 原子递归**；块体「语句候选目录」的挂载代码已按
`BodyGuideUtil.MountBodyGuide` 模式接好，但由 `EnableBlockBodyCatalog` 默认关闭（原因见 §3）。
XML 逐字节、AST 逐节点与 legacy 完全一致，文件级 fallback 为 0。

## 2. 块壳设计（改了哪 4 个文件）

| 文件 | 改动 |
|---|---|
| `typescript/tokens/statements/statement-route-util.xl.md` | 新增 `StatementRoute.ShellBlock = 5`；`Decide` 的 Bracket 分支里 `StartBracketChar === "{"` 返回 `ShellBlock`（原来返回 `Legacy`）；新增开关 `EnableBlockBodyCatalog:bool = false` 与计数 `BlockShellCount:int = 0` |
| `typescript/tokens/statements/block-possible-shape.xl.md` | 原来是两个 throw 桩，现在落地 `ComputeByIndex` / `IsBuildable` / `BuildByIndex` + `CreateBodyPossibleShapes()` 静态缓存 |
| `typescript/tokens/statements/statement-shape.xl.md` | 新增 `BodyKind:int = 0` 与常量 `BodyKindBlock = 1` / `BodyKindObjectLiteral = 2`（设计 §1.4 的字段契约） |
| `typescript/tokens/files/source-file-shape.xl.md` | 根目录注册 `new BlockPossibleShape()`（原来是被注释掉的一行） |

### 2.1 `{` 二义的裁决点只在 `StatementRouteUtil.Decide`

- 语句首 `{` 只可能是块语句：对象字面量只出现在表达式位置（`({ a: 1 });` 的语句首是 `(`，
  走 `ShellPlainExpression`；`x = { a: 1 }` 的 `{` 在 `=` 之后，由 `ExpressionBuilder` 吃）。
- 所以只是把「Bracket 分支里 `{` 返回 Legacy」改成返回 `ShellBlock`，**Bracket 里没有新增任何判据**，
  `core/syntax/basic-tokens/bracket.xl.md` 一行未改，`StatementBoundaryUtil.IsAsiBoundary` 一行未改。

### 2.2 互斥（不靠先后）

`Decide` 判成 `ShellBlock` 后：`StatementPossibleShape`（legacy 语句族）在 `ComputeByIndex` 顶部
对「非 `Legacy`」主 `Reject`；`ExpressionStatementPossibleShape.CanStart` 对 `{` 本来就返回 `false`。
两边永远不会同格 Accept —— `--double-accept` 冲突 0 是这条的机器证据。

### 2.3 块壳为什么与 `(a);` 同构

`{` 与 `(` 都是 `Bracket` 原子单元。`BlockPossibleShape.BuildByIndex` 与
`RootExpressionStatementPossibleShape.BuildByIndex` **逐字同构**：搬 `[start..tokenIndex]` 的 raw 单元进
`new StatementShape`、`Pos` 取「前一个非 trivia 单元 `EndIndex`」、`shell.Add()` 逐个搬（`Add` 设
`Parent`）、`shell.SignIn()`、`shell.CatalogGuide = new CatalogGuide([], new StatementEndPossibleShape())`、
原位 `splice` 插回、`host.MountedUnit = shell`。后续字符由壳的 `MountedUnit` 路由进那个还没闭合的
`{` 括号；`}` 闭合时 `Bracket.Close` 问**父单元（= 壳）**，壳的终结候选收口。

### 2.4 终结判据没有第二份

`StatementEndPossibleShape.StatementKind` 保持 `0`，即沿用 legacy 的 `StatementScanner.ScanRoot`
（`{ }` 的结束由扫描器说）。**没有**走表达式族的 `ExpressionEndCode`，也没有新写 ASI 判据。

### 2.5 AST 零差异的结构性原因

壳收口时 `StatementShape.BuildFromShell` 把**同一个** `{ ... }` 括号单元（内部仍是 raw basic token）
交给**同一个** `StatementBuilder`，走 `BuildBlock()`，`Pos` 同口径。三条与 legacy
（`StatementPossibleShape.BuildByIndex` → `BuildStatement` → `BuildBlock`）逐字相同，
所以 XML 逐字节、AST 逐节点一致，不是「对拍出来的巧合」。

## 3. 块体目录挂载方式（已接好，默认关）

- 挂载点：`BlockPossibleShape.BuildByIndex` 里，`{` 括号已经搬进壳之后（`moved.length === 1` 且
  该单元是 `StartBracketChar === "{"` 的 `Bracket`），调用
  `BodyGuideUtil.MountBodyGuide(bodyBracket, BlockPossibleShape.CreateBodyPossibleShapes())`。
- 目录内容：`CreateBodyPossibleShapes()` = `[new VariableStatementPossibleShape(), new
  RootExpressionStatementPossibleShape()]`，用 `BodyGuideUtil.CreateShapesCache` 做「只建一份」缓存
  （与 interface body 挂成员目录完全同一模式；候选实例无状态，判定状态在
  `CatalogGuide.PossibleShapesComputeCache` 里，共用安全）。
- **为什么默认关**：`StatementBuilder.BuildBlock()` 只吃 raw basic token。块内一旦被增量建成
  `StatementShape` 形状（哪怕只建 `f();` 一条），`BuildBlock` 就没有「收集已建语句」的通道 ——
  它会把形状单元当普通单元塞进 `StatementBuilder`，建错树，然后**由文件级 fallback 掩盖**，
  表现为「测试全绿但其实没接管」。按方法论「未覆盖构造安全回退、不伪造绿」，先关。
- 需要的下一手（Stage 4b）：给块体做一个 `CollectBodyStatements`，对齐
  `BodyGuideUtil.CollectBodyMembers` 的两条路 —— 已建形状按序收集、尾部 raw 交
  `BuildBlock` 的成员级等价物；然后才能把 `EnableBlockBodyCatalog` 打开并断言
  `TotalShapeAst`/块内候选计数。

## 4. 专用 cases

新增 `tests/statement-possible/block-cases.json`（组 `stage4-block`，`needs:
["root:BlockPossibleShape"]`），并把同一组（英文描述版）插进 `tests/statement-possible/cases.json`，
`harness.mjs` 的 `GROUP_ORDER` 加入 `stage4-block`，所以 **`--all` 会真的跑它**（不再是 skip）。

12 条：`{}` / `{ let x = 1; f(); }` / `{ if (a) b; }` / `{ { a; } }` / `{ let a = 1\nlet b = 2\nf() }` /
`{ // c\n a; /* d */ }` / `{ "s"; }` / `{ a.b; }` / `function f() { let x = 1; }` /
`class C { m() { a; } }` / `{ a; }\n{ b; }` / `({ a: 1 });`。

每条自动断言四件：① 壳路径 XML == 同源码 legacy（`EnableShellExpressions=false`）逐字节；
② AST == `ts.createSourceFile` 逐节点；③ 同源码两次 Parse XML 逐字节相同；④ 形状树不泄漏
`StatementShape`（另有 `double-accept` 与 0 存活候选探针在 harness 里）。

结果：`pass=12 fail=0 skip=0 uncovered=0`；`双路仪器 double-accept 冲突 0`；
`file-fallback total=0 distinct=0`。

## 5. 块壳接管证据（计数，独立于 cases）

一次性探针（`build/ts` 直接 require，见 §8 命令）：根候选 16 个、`hasBlock=true`；
逐条源串的 `BlockShellCount` 增量与 XML 里是否出现 `BlockShape`：

| 源码 | shells 增量 | XML 有 BlockShape | file-fallback |
|---|---|---|---|
| `{}` | 1 | true | 0 |
| `{ let x = 1; f(); }` | 1 | true | 0 |
| `{ if (a) b; }` | 1 | true | 0 |
| `{ { a; } }` | 1 | true | 0 |
| `{ a; }\n{ b; }` | 1 | true | 0 |
| `{ // c\n a; }` | 1 | true | 0 |
| `function f() { let x = 1; }` | 0 | true（体由 FunctionDeclarationShape 交 BuildBlock） | 0 |
| `class C { m() { a; } }` | 0 | true（成员体） | 0 |
| `({ a: 1 });` | 0 | false（对象字面量，块候选不接） | 0 |
| `let a = 1\n{ b; }` | 1 | true | **1** |

两处要注意（都进 §6/§7）：连写两块只接管第一块；`let a = 1` 后接裸块会走一次文件级 fallback。

## 6. 未覆盖清单

1. **块内语句未由 possible 接管**：`EnableBlockBodyCatalog = false`，块内仍 `BuildBlock` 原子递归。
   缺的是块体「已建语句收集」通道（§3 最后一段）。
2. **同一文件第二块不建壳**：`{ a; }\n{ b; }` 只建 1 个壳，第二块走 legacy。AST 一致（cases 绿），
   但接管率是 1/2。原因推测在根目录 `ItemStart` 复位后 `BlockPossibleShape` 首格判定被上一块的
   剩余单元挡住；**未定位**。
3. **`let a = 1\n{ b; }` 触发文件级 fallback**（错误文本「表达式语句没有读完」）。AST 正确（fallback
   整文件重解析），门禁全绿，但这是**接管失败**而不是接管。是否基线既有**未实测**（未在 76d6902f
   上单独复跑该形），列为风险 R1。
4. 控制流语句族（if/for/while/try/switch/labeled/empty…）**未壳化**（Stage 4 剩余），`stage4` 组仍
   skip；`ShellStatementFamily = 4` 仍留空未用。
5. 空语句 `;` 仍 `Legacy`。
6. 本轮**未复跑**：`op-ast-proof.mjs`、`op-proof.mjs`、`tests/feas-operator/*`、`dev` 组单跑
   （dev 已包含在 `--all` 里通过）。改动不触及操作符路径，按「文件集不重叠」判断不受影响，但未实测。

## 7. 全表读数（cwd = 本目录，改动后实测）

| # | 门禁 | 读数 | 判定 |
|---|---|---|---|
| 1 | xl_build（core,typescript → ts） | 886 written / 0 error / 2505 warning | PASS |
| 2 | `tsc -p tsconfig.json` | exit 0 | PASS |
| 3 | `ast-json.mjs` 重生成 | 6167 条 cj-ok=6167 cj-fail=0 | PASS |
| 4 | `git status --short typescript/cases` | 空 | PASS（等价） |
| 5 | `ast-json-diff.mjs` | 6167/6167 完全一致；结构差 0 / 位置差 0 / 字段差 0 | PASS |
| 6 | `tests/parse/validate.mjs` | 1720 条 / 0 不合格 | PASS |
| 7 | `token-ast.mjs --quiet` | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 | PASS（与基线同） |
| 8 | `real-dts-ast.mjs` | 226 文件：成功 226 / 崩溃 0 / AST 一致 226 | PASS |
| 9 | `harness --all` | groups run=7 skipped=3（stage4/stage5 既有 skip）cases pass=84 fail=0 known=1 | PASS（基线 72/0/known1 → +12 全绿） |
| 10 | `harness --double-accept` | cases=103 failed=0；冲突 0；waitingNoCandidate=175（基线同） | PASS |
| 11 | `harness --lint` | PASS（ASI 实现唯一 / 优先级数字表只在 operator-table） | PASS |
| 12 | `perf.mjs` many=2000 | median 29.01ms，callsPerToken=16.01；scale ratio 1.82 / 2.23 | PASS（≤2.5） |
| 13 | `stage4-block` 组 | pass=12 fail=0 skip=0 uncovered=0 | PASS |

## 8. 复跑命令

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/harness.mjs --file=tests/statement-possible/block-cases.json --group=stage4-block --verbose
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/harness.mjs --lint
node typescript/cases/ast-json.mjs ; git status --short typescript/cases ; node typescript/cases/ast-json-diff.mjs
node tests/parse/validate.mjs
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/perf.mjs
git checkout -- typescript/cases
```

## 9. 风险

| id | 风险 | 触发条件 | 兜底 |
|---|---|---|---|
| R1 | `let a = 1` 后接裸块走文件级 fallback（§6.3）：正确但慢一倍，且说明该形接管失败 | 该源码形 | 文件级 fallback 保 AST 不变；需定位后修 |
| R2 | 第二块不建壳（§6.2）：接管率 1/2，慢路径 | 同文件连写两块 | AST 一致；不影响正确性 |
| R3 | 块体目录一旦打开会建错树（§3） | 有人把 `EnableBlockBodyCatalog` 置 true | 开关默认 false；打开前必须先做 Stage 4b 的收集通道 |
| R4 | `BodyKind` 目前只有块会置位，对象字面量不产生该取值 | 后续 Stage 读 `BodyKind` 的代码若假定它总有值 | 取值 `0` = 未定，读方需按 0 分支 |
| R5 | lint 的 KNOWN 条目仍指 `expression-builder.js:311` 的 `as` 固定优先级 11 | Stage 3 未迁 `OperatorTable.AsPrecedence` | 既有已知项，非本轮引入 |

## 10. 下一手（Stage 4b）

1. 块体 `CollectBodyStatements`（对齐 `BodyGuideUtil.CollectBodyMembers`），打开
   `EnableBlockBodyCatalog`，用 `TotalShapeAst` + 块内候选计数证明块内接管。
2. 定位 §6.3 的 fallback 与 §6.2 的第二块不建壳（两者都可能同在 `ItemStart` 复位路径上）。
3. 控制流语句族壳化（`ShellStatementFamily`），把 `stage4` 组从 skip 变实跑。