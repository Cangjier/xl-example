# possible-statement：legacy 面盘点（Stage 5d）

> 分支 `feature/possible-statement-s5d`，基线 `feature/possible-statement` @ **`fa6ecbc1`**。
> 工作目录 `C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s5d`（`node_modules` 为 junction）。
> 口径：只读盘源码 + 跑测试；**未改任何生产 `.xl.md`**，未手改 `dist/`。本文里每个「已接管」都有计数或 gate 读数，
> 每个「仍 legacy」都指到文件/入口；没有读数的项目明确标「未复核」。
>
> 一句话结论：**语句壳已经是「表达式语句 / 变量声明 / 控制流族 / 块 / 标签 / 块体语句 / switch 子句语句」的宿主，
> 但声明与导入导出族默认关、块内 `class` 默认关，且 `StatementBuilder` 的整段建树与 `ScanRoot` 兜底仍是最终裁判。**
> 表达式一侧：操作符/优先级/插入已由形状树驱动，**逗号、赋值形状命名、对象方法与对象返回类型仍是 legacy 口径**。

---

## 0. 事实来源与复核方式

| 类别 | 来源 |
| --- | --- |
| 路由常量与开关默认值 | `typescript/tokens/statements/statement-route-util.xl.md`（`Route` 常量 §L30-70、开关 §L124-309） |
| 块体挂载开关 | `typescript/tokens/statements/block-possible-shape.xl.md`（§L94 / §L287 / §L296 / §L633） |
| 各 Stage 的交接结论 | `HANDOFF-s4*.md` 23 份（尤其 `HANDOFF-s4aa.md` §4 全表读数、§5 未覆盖） |
| 本轮可执行读数 | `tests/statement-possible/final-matrix.mjs`（新增）、`tests/statement-possible/declaration-statement-takeover.mjs`（双模式改造）、`HANDOFF-s5d.md` 附录 |

复核命令（cwd = 本分支工作目录）：

```powershell
node tests/statement-possible/final-matrix.mjs            # 38 条能力矩阵（含计数增量）
node tests/statement-possible/final-matrix.mjs --decl     # 声明族开档
node tests/statement-possible/final-matrix.mjs --class    # 块内 class 开档
node tests/statement-possible/declaration-statement-takeover.mjs          # 默认关
node tests/statement-possible/declaration-statement-takeover.mjs --open   # 开档
```

---

## 1. 语句级：路由表与已接管族

### 1.1 `StatementRoute` 常量（`statement-route-util.xl.md`）

| 常量 | 值 | 语义 | 谁建壳 / 谁收口 |
| --- | --- | --- | --- |
| `None` | 0 | 本族不管这一格，继续等（`Uncertain`，**不是** `Reject`） | — |
| `ShellPlainExpression` | 1 | 表达式语句 / 子句语句：`;` / EOF / ASI 收口 | `RootExpressionStatementPossibleShape`、`CaseClauseStatementPossibleShape` |
| `ShellVariable` | 2 | `let/const/var` 语句 | `VariableStatementPossibleShape`（三层，见 §1.3） |
| `Legacy` | 3 | 交给 legacy 整段建树 | `statement-possible-shape` / `source-file-end-possible-shape` → `StatementBuilder` |
| `ShellStatementFamily` | 4 | 控制流族 / 块内 `class` / 块内 `await`：`ScanRoot` 判界 | `ControlFlowStatementPossibleShape`、`AwaitStatementPossibleShape`、`DeclarationStatementPossibleShape`（块体目录） |
| `ShellBlock` | 5 | 块语句 `{ … }`（由括号事件挂块体目录） | `BlockPossibleShape` |
| `ShellLabel` | 6 | `lbl: stmt`（在 `:` 格建壳） | `ControlFlowStatementPossibleShape`（标签入口） |
| `ShellDeclarationFamily` | 7 | 根层声明 / 导入导出：`;` / EOF / ASI 收口 | `DeclarationStatementPossibleShape`（**默认关**） |

### 1.2 已由 possible 驱动的语句族（默认开关下）

「接管计数」是进程内只增计数器，读数取自 `final-matrix.mjs` 默认档（`HANDOFF-s5d.md` 附录 A）。

| 语句族 | 起点判据 | Route Kind | 候选 / 文件 | 默认 | 本轮读数 |
| --- | --- | --- | --- | --- | --- |
| 表达式语句（根） | 标识符 / 字面量 / `(` `[` / 一元符号 | `ShellPlainExpression` | `root-expression-statement-possible-shape.xl.md` | 开 | `expr-*` 11 条 AST 全等，壳计数无专用项（按族只记 XML/AST） |
| 变量声明 | `let/const/var` + `StartsBinding` | `ShellVariable` | `variable-statement-possible-shape.xl.md` + `variable-statement-three-layer.xl.md` | 开 | `var-simple/list/destructure` 3 条全等 |
| `if / while / do / for / for-in / for-of / switch / try / return / throw / break / continue / debugger / with` | 关键字起点 | `ShellStatementFamily` | `control-flow-statement-possible-shape.xl.md` | 开 | `ControlFlowShellCount`：if/while/for/for-of/try/do/return 各 +1 |
| 空语句（根 / 块体） | 语句首 `;` | `ShellStatementFamily` | 同上（`EnableControlFlowEmpty`） | 开 | `empty-root` cf=+1、`empty-in-block` shell+1/cf+1 |
| 标签语句 | `ident` + `:`（文档级前瞻 `IsLabelColonAhead`） | `ShellLabel` | 同上（4f 修判据） | 开 | `LabelShellCount=+1` |
| 块语句 | `{`（括号事件） | `ShellBlock` | `block-possible-shape.xl.md` | 开 | `block` shell+1/body+1、`block-nested` shell+2/body+2 |
| 块体内部语句 | 块体 `{` 上的目录 | 各族的 body 入口 | `block-possible-shape.xl.md`（`EnableBlockBodyCatalog`） | 开 | `BlockBodyStatementCount`：if/while/for/try/函数体/箭头体/对象方法体/子句 case 体均 > 0 |
| 函数体 / 箭头体 / 对象方法体 / switch case 体 / 控制流体 | `{` 前是 `)` / `=>` / 返回类型 / 属于控制流壳 | 挂载点（非语句族） | `block-possible-shape` 的 `TryMount*` 一族 | 开 | `FunctionBodyMountCount` / `ArrowBodyMountCount` / `SwitchCaseBodyMountCount` / `ControlFlowBodyBraceCount` |
| 块体内 `await` 语句 | `await` 首代码单元、宿主是块体 `{` | `ShellStatementFamily` | `AwaitStatementPossibleShape`（4l） | 开 | `await-block`：`AwaitShellCount=+1` + fnBody+1 |
| switch 子句级语句 | `case …:` 之后、宿主是 case 块 `{` | `ShellPlainExpression`（4aa 修正） | `case-clause-statement-possible-shape.xl.md` | 开（双开关） | `clause-one` shell=1、`clause-two` shell=2、`clause-case-body` body=1 |
| 声明 / 导入导出（根层） | `interface/enum/type/namespace/module/declare/import/export/using` | `ShellDeclarationFamily` | `declaration-statement-possible-shape.xl.md` | **关** | 默认 `DeclarationShellCount=0`（27/27 用例）；开档 21/27 接管（§6.1） |

### 1.3 let/const/var 的三层 possible

`variable-statement-three-layer.xl.md` 是三层实现的落点（计数：`StatementCount` / `ListCount` / `DeclarationCount` / `FallbackCount` / `MismatchCount`，开关 `Enabled`）：

| 层 | 判什么 | 产物 | 状态 |
| --- | --- | --- | --- |
| 语句级 | 首代码单元 `let/const/var` + 下一格 `StartsBinding` | `StatementShape`（`Kind=ShellVariable`） | 已落地 |
| 列表级 | `Decl (',' Decl)*` 与逗号、`;`/ASI 收口交给 `EndPossible` | 声明列表 | 已落地（`ListCount` 可读） |
| 单条声明 | `Name (!)? (= Initializer)? (: Type)?`、解构 | `VariableDeclarationShape` | 已落地（`DeclarationCount` 可读） |

> 结论：**「let/const 有对应 possible」这一条不只在语句级成立，列表/单条两级也在**；但它们只覆盖变量声明，
> `interface/type/enum/namespace/module/declare/import/export/using` 是另一条族（§6.1），默认关。

---

## 2. 语句级：仍由 legacy 驱动的部分（逐族列入口）

| 族 / 形态 | 现状 | 入口（文件:方法） | 证据 |
| --- | --- | --- | --- |
| 根层声明 / 导入导出（`interface/type/enum/namespace/module/declare/import/export/using`） | `Decide` 判 `Legacy` | `statement-route-util.xl.md:250`（默认 false）→ `statement-possible-shape.xl.md` / `source-file-end-possible-shape.xl.md` → `statement-builder.xl.md:BuildStatement` | 探针默认档 27/27 `decl=0`；开档 2 条已知缺陷（§6.1） |
| `function` / `class` / `abstract class` 声明（含体） | 语句不做壳；**体**由括号事件挂块体目录 | `expression-statement-possible-shape.xl.md`（`IsLegacyKeyword`）→ `expression-builder.xl.md:Parse*Body` / `statement-builder.xl.md:BuildFunctionDeclaration/BuildClassDeclaration` | `declaration-statement-cases.json` 的 `control-function-body` / `control-class-body` / `control-abstract-class`：decl=0 |
| 块内 `class` 声明 | `Decide` 只对「宿主是块体 `{`」的 `class` 判 `ShellStatementFamily`，但开关默认关 | `statement-route-util.xl.md:297`（`EnableBlockClassShell=false`） | `final-matrix.mjs --class`：`block-class` 的 `ControlFlowShellCount=+1`；默认档无该增量、块壳仍 +1 |
| 声明体内部的语句（类成员体、命名空间体、枚举体） | 体括号由既有 `BodyGuide` / 声明体 possible 候选负责，**不是语句壳** | `typescript/tokens/declarations/*-possible-shape.xl.md`（`class-declaration-possible-shape` 等）、`body-guide-util.xl.md` | 未建独立 gate：本轮只验证「体里语句被建对」（AST 全等） |
| 其它一切 `Decide` 返回 `Legacy` 的起点 | 整段 raw → `ScanRoot` → `StatementBuilder.BuildStatement` | `statement-scanner.xl.md:ScanRoot`、`statement-builder.xl.md:BuildStatement`（约 2327 行的分派） | 全表 ast-json 6167/6167、token-ast crash=0 diff=0 |
| `switch` 子句内的已知缺口（见 §6.5） | 树对、**接管少**、个别触发文件级 fallback | `case-block-possible-shape.xl.md` / `case-clause-statement-possible-shape.xl.md` + `BuildCaseBlock` 的 legacy 递归 | `HANDOFF-s4aa.md` §5.1-5.3；`final-matrix.mjs` 的 `clause-nested-known-gap` |
| `{` 的二义（块 vs 对象字面量）在根层 | 仍归 `Decide` / 括号事件裁决，未改成「先建壳再判」 | `statement-route-util.xl.md:Decide` + `source-file-shape.OnBracketCreatedEvent` | 未复核；设计 §1.4 的预留口仍在 |

**要点**：legacy 并没有「退场」，它现在是**兜底 + 最终建树者**：所有已接管语句在收口后仍调用同一个
`StatementBuilder.BuildStatement`（同一份 raw 切片、同一 `Pos`），这是 AST 零差异的根；`ScanRoot` 仍是
`ShellStatementFamily` 的判界器。也就是说「接管」当前衡量的是**判界/挂载/建壳由 possible 完成**，
而**建树**仍是原子的 legacy 建造器——这是「完整重构（§6.9）」尚未达成的核心事实。

---

## 3. 表达式级：已由「形状树 → AST」驱动的形态

证据：`op-ast-proof.mjs`（90/90）、`op-proof.mjs`（40/40）、`harness --all` 的 `operators-live`（40 条）、
`final-matrix.mjs` 的 `expr-*` 11 条（AST/XML 全等）；优先级唯一来源是 `operator-table.xl.md`（lint：数字优先级条目 12、只在 `operator-table`），
插入原语是 `shape-insert-util.xl.md:InsertBetween`（`tests/feas-operator/insert-between.test.mjs` 9/9）。

| 形态 | 承载候选（`typescript/tokens/expressions/`） | 状态 |
| --- | --- | --- |
| 操作数叶子：数字 / 标识符 / 字符串 / 正则 / 模板 / `(`…`)` / `[`…`]` / 对象字面量 | `* -possible-shape` + `*-shape`（`parenthesized` / `array-literal` / `object-literal` / `template-*`） | 已接管 |
| 二元（含 `&&`/`\|\|`/`??`/`instanceof`/`in`/比较/位/移位/`**`） | `binary-expression-possible-shape.xl.md` + `feas-binary-operator-possible-shape.xl.md`（正式化） | 已接管，优先级/结合性由表 |
| 前缀一元（`! ~ + - ++ -- typeof void delete`）/ 后缀 `++ --` | `prefix-unary-*`、`postfix-unary-*`、`type-of-*`、`delete-*`、`void-*` | 已接管 |
| 赋值 / 复合赋值 | `feas-*` 正式化族 + `aliases/first|last-assignment-*`、`first|last-compound-assignment-*` | 已接管（**形状命名仍是 legacy 口径**，§4） |
| 条件 `?:` | `conditional-expression-possible-shape.xl.md` | 已接管 |
| `as` / `satisfies` / 类型断言 / 非空 `!` | `as-*`、`satisfies-*`、`type-assertion-*`、`non-null-*` | 已接管（`satisfies`/类型实参二义是 A 的历史根因，语料常驻） |
| 调用 / 成员 / 下标 / 可选链 / `new` / `import.meta` / 动态 `import()` | `call-*`、`property-access-*`、`element-access-*`、`new-*`、`meta-property-*`、`expression-with-type-arguments-*` | 已接管（`expr-optional`、`expr-import-meta`、`expr-dynamic-import` 全等） |
| 箭头 / 函数 / 类表达式 | `arrow-function-*`、`function-expression-*`、`class-expression-*` | 已接管（`expr-arrow`、`expr-async-arrow`、`expr-class` 全等） |
| `await` / `yield` / 展开 / 标签模板 | `await-expression-*`、`yield-expression-*`、`spread-element-*`、`tagged-template-*` | 已接管 |
| 合成 / 省略 / 类元素分号 | `synthetic-*`、`omitted-expression-*`、`semicolon-class-element-*` | 已接管（内部用途） |

---

## 4. 表达式级：仍 legacy 的形态

| 形态 | 现状 | 入口 | 证据 / 备注 |
| --- | --- | --- | --- |
| **逗号表达式** `a, b;` | legacy 建 `BinaryExpression`（逗号当二元），TS 是 `SequenceExpression` | `expression-builder.xl.md`（逗号按二元处理）；路由不变量把逗号留 legacy | **未纳入本轮 gate**；`final-matrix` 的 `expr-comma` 只覆盖调用实参 `a(b, c)`（不触发该路径） |
| **赋值语句的形状命名** | 语句级 AST 全等门比较到 `FirstAssignment` vs `EqualsToken` 字段时必然 DIFF | `aliases/first-assignment-*` 与 `statement-shape-ast.xl.md` 的名字映射 | 任务基线记录；**本轮未复核**（真实 AST 门 ast-json 6167/6167 不含该字段） |
| **对象方法 + 对象返回类型** | 既有缺陷：方法返回类型为对象字面量类型时体/类型边界判错 | `expression-builder.xl.md:ParseObjectLiteral` / `statement-builder.xl.md` 的方法分派 | 任务基线记录；**本轮未复核** |
| `do b\n{}` / `()=>1\n{}`（换行后 `{`） | 已知形态缺陷，未修 | `statement-scanner.xl.md` / `expression-builder.xl.md:ParseArrowBody` | 任务基线记录；**本轮未复核** |
| 声明/类型里的表达式与类型 | 由 `expression-builder.xl.md` / `type-builder.xl.md` 整段建，不是 possible 形状树 | 同上 | 声明族默认关 → 该路径仍是主路径 |
| JSX / 装饰器体 | 未在 possible 面内 | `typescript/tokens/jsx/*`、`decorator-*` | 未复核 |

---

## 5. 开关矩阵（每个 `Enable*`：默认 / 作用 / 关闭回退 / 证据）

| 名称 | 默认 | 作用 | `false`（或关闭）时回退 | 全表证据 |
| --- | --- | --- | --- | --- |
| `StatementRouteUtil.EnableShellExpressions` | `true` | 壳化总闸；`false` = 新候选全部 `Reject`、legacy 全接管 | 逐位回到 Stage 1 前（harness 双路对拍档） | harness `--all` / `--double-accept`；所有探针的 legacy 档 |
| `EnableFileFallback` | `true` | 新路径抛错时整文件按 legacy 目录重解析 | `false` 时不触发，行为逐字节不变 | `FileFallbackCount` / `LastFileFallback`；全表 `fallback total=0` |
| `EnableBlockBodyCatalog` | `true` | 块体 `{` 挂语句目录（变量 + 表达式 + 控制流 + 块 + await） | 块内整段 raw 交回 legacy 递归 | `block-body-takeover` 21 条；`BlockBodyStatementCount` |
| `EnableArrowBodyCatalog` | `true` | `=> {…}` 体挂目录 | 箭头体保持 raw/legacy | `ArrowBodyMountCount`；`arrow-body` |
| `EnableObjectMethodBodyCatalog` | `true` | 对象方法/访问器体挂目录 | 对象方法体保持 raw/legacy | `object-method`（body+1、fnBody+1） |
| `EnableControlFlowShell` | `true` | `if/while/do/for/switch/try/return/throw/break/continue/debugger/with` + 标签 + 空语句判 `ShellStatementFamily`/`ShellLabel` | 这些起点重新判 `Legacy`（逐位回到 4b 前） | `control-flow-takeover` 39 条；`cf-body-takeover` 46 条 |
| `EnableControlFlowLabel` | `true` | 标签语句随控制流壳（4f 修判据后默认开） | 标签走表达式壳的 legacy 分派 | `LabelShellCount`；`label` 用例 |
| `EnableControlFlowEmpty` | `true` | 语句首 `;` 归壳（4d 尾巴重放后开） | 空语句由 legacy `BuildEmpty` 建 | `empty-root`；`s4c2-empty*` |
| `EnableAwaitStatement` | `true` | 块体目录里补 `await` 起点候选 | 该候选整体 `Reject`，await 语句留 raw | `AwaitShellCount`；`await-block` |
| `EnableDeclarationShell` | **`false`** | 根层声明/导入导出判 `ShellDeclarationFamily` | 重新判 `Legacy`（逐位回到 4p） | 探针默认 27/27 `decl=0`；开档 25/27（§6.1） |
| `EnableSwitchCaseClause`（`StatementRouteUtil`） | `true` | 子句语句判壳（4aa 转正） | 子句语句由 `BuildCaseBlock` legacy 递归建（树仍对） | `SwitchCaseClauseShellCount`；`stage4aa` 12 条 |
| `EnableSwitchCaseClause`（`BlockPossibleShape`） | `true` | case 块 `{` 挂**只含子句候选**的目录 | 不挂 → mount=0（**必须与上一行同开同关**，否则假空转） | `SwitchCaseClauseMountCount`；`HANDOFF-s4aa` §5.5 |
| `EnableBlockClassShell` | **`false`** | 块内 `class` 起点判 `ShellStatementFamily`（`ScanRoot`，`}` 收口） | 块内 `class` 走 legacy | `final-matrix --class`：`block-class` cf=+1；打开态**未跑全表** |
| `BlockPossibleShape.EnableBlockDeclarationCatalog` | `true` | 块体目录注册 `DeclarationStatementPossibleShape` | 块内声明不走声明族候选 | 未单独建 gate；默认 `decl=0` 与之一致 |
| `BlockPossibleShape.EnableSwitchCaseBody` | `true` | case 体 `{` 挂块体目录 | case 体保持 raw | `SwitchCaseBodyMountCount`；`clause-case-body` |
| `BlockPossibleShape.EnableBlockFunctionBody` | `true` | 块内函数声明体挂目录 | 块内函数体保持 raw | `BlockFunctionBodyMountCount` |
| `VariableStatementThreeLayer.Enabled` | `true` | 变量声明三层 possible | 声明列表回退整段 | `variable-statement-three-layer` 计数（`FallbackCount`/`MismatchCount`） |
| `StatementRouteUtil.EnableShellStatements` | `0`（位掩码） | 设计里的 Stage 4 灰度位，**当前恒为 0** | 未接线 | 路由源码注释 |

> **开关纪律**：同名 `EnableSwitchCaseClause` 在 `StatementRouteUtil` 与 `BlockPossibleShape` 上各有一份，
> 只开一处 = 挂载/判型只剩一侧（mount=0 或 shell=0），**不是**「部分生效」。这是本轮盘点发现的唯一「同名单点风险」。

---

## 6. 剩余 gap 清单

| # | Gap | 影响 | 证据位置 | 本轮读数 / 状态 |
| --- | --- | --- | --- | --- |
| 6.1 | **声明族开档回归**：`interface I { }` ⏎ `const a = 1;` 双建壳（decl=2）；`type T = 1;` ⏎ `enum E { A }` ⏎ `export { T, E };` 里 enum 退化成 raw（decl=2 vs 3） | 开档 27 条里 25 条过、2 条组合形态红（AST range 差：`InterfaceDeclaration` / `EnumDeclaration` 终点吞到下一句） | `HANDOFF-s4r`（默认关的决定）、`HANDOFF-s4aa` §5.6、`tests/statement-possible/declaration-statement-takeover.mjs --open`（KNOWN-GAP 2 条） | 已复现并固化为 KNOWN-GAP（不再红门，但**缺陷仍在**） |
| 6.2 | **赋值壳 DIFF**：`FirstAssignment` vs `EqualsToken` | 「语句级 AST 全等」门一旦比到形状字段就在赋值上必然 DIFF → 该门对赋值不可用 | 任务基线；`aliases/first-assignment-*` | 未复核（真实 AST 门 ast-json 6167/6167 通过，因为不比形状名） |
| 6.3 | **逗号**：legacy `BinaryExpression` vs TS `SequenceExpression` | `a, b;` 的 AST 结构错（真实门 ast-json 未覆盖该形态？本轮未验证） | `expression-builder.xl.md` | 未复核；矩阵只覆盖调用实参逗号 |
| 6.4 | **块内 class**：`EnableBlockClassShell=false` | 块内 `class` 不建壳、`BlockBodyStatementCount` 不增（树对） | `statement-route-util.xl.md:297`、`HANDOFF-s4y` | 默认关；`--class` 开档矩阵 38/38 全绿，但**开档全表未跑** |
| 6.5 | **switch 子句 gap**：① `case 1: if (x) { y; } b;` → shell=1 但 `LastFileFallback=true`；② `case 1: ; case 2: ;` → `file-fallback total=2`；③ 嵌套 switch 内层子句不接管 | 接管少 + fallback 读数；树仍逐字节正确 | `HANDOFF-s4aa` §5.1-5.3；`final-matrix` 的 `clause-nested-known-gap` | ③ 已固化；①② 未进本轮 gate |
| 6.6 | **`do b\n{}` / `()=>1\n{}`** | 换行后 `{` 的归属错（未修） | 任务基线 | 未复核 |
| 6.7 | **对象方法 + 对象返回类型** | 既有缺陷，体/类型边界误判 | 任务基线 | 未复核 |
| 6.8 | **声明体语句**（类/命名空间/枚举体）不由语句壳驱动 | 「语句 = 壳」的覆盖面在声明体上仍是 legacy 体指南 | `typescript/tokens/declarations/*`、`body-guide-util.xl.md` | 未建 gate（AST 结果由全表覆盖） |
| 6.9 | **`StatementBuilder` / `ScanRoot` 仍是最终建树与判界者** | 「完整重构」未达成：壳只做判界/挂载，收口仍原子喂 legacy 建造器 | `statement-builder.xl.md:BuildStatement`、`statement-scanner.xl.md:ScanRoot` | 架构事实（见 `docs/possible-statement-completion-matrix.md` §5） |
| 6.10 | harness `known=1` | 一条既有已知用例被跳过式记录 | `harness.mjs --all` 读数 | `known=1`，未在本轮展开 |
| 6.11 | 同名双开关（§5） | 只开一处 = 假空转 | `statement-route-util.xl.md:270` / `block-possible-shape.xl.md:633` | 未合并（4aa 按双开关同开交付） |

---

## 7. 附录：Stage 5d 全表读数（默认态）

`xl_build`：**51 written / 841 skipped / 0 error**（产物树从主仓库同步后按指纹增量重写，源码未改）；`tsc` exit 0。

| 项 | exit | 读数 |
| --- | --- | --- |
| `declaration-statement-takeover.mjs`（默认） | 0 | 27/27，`actualDefault=false`、`decl=0`、`takeover=0` |
| `declaration-statement-takeover.mjs --open` | 0 | 27 条：pass=25、knownGap=2、failed=0、`takeover=21`、`totalShell=23` |
| `final-matrix.mjs` | 0 | cases=38、`shapeAst=38/38`、`xmlEqLegacy=38/38`、`astEqTS=38/38`、knownGap=2、failed=0 |
| `final-matrix.mjs --decl` | 0 | 同上 38/38（声明族 3 条 `DeclarationShellCount=+1`） |
| `final-matrix.mjs --class` | 0 | 同上 38/38（`block-class` cf=+1） |
| `harness --all` | 0 | groups run=8 skipped=3；cases pass=101 fail=0 known=1；fallback 0；double-accept 0 |
| `harness --double-accept` | 0 | cells=825 candidateCalls=5511 endCalls=822 acceptCells=191；冲突 0；cases=120 failed=0 |
| `harness --lint` | 0 | PASS（ASI 唯一 / 优先级数字表只在 `operator-table`，条目 12） |
| `ast-json` | 0 | 6167/6167，cj-fail=0；`git status typescript/cases` 0 行 |
| `ast-json-diff` | 0 | 6167/6167；结构差 0、位置差 0、字段差 0 |
| `token-ast` | 0 | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 |
| `real-dts` | 0 | 226/226 解析成功、崩溃 0、AST 全等 226 |
