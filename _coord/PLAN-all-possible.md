# PLAN-all-possible — 全场景增量形状（token-time-shapes）技术方案与 WP 拆分

- **任务**：`task-1`（T1：全场景增量形状技术方案与 WP 拆分）
- **勘察基线**：`feature/all-possible` @ `980edc1d`（canonical 只读）
- **本方案分支**：`feat/plan-all-possible`（克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\plan-all-possible`）
- **唯一代码产物**：本文件。**不改任何源码 `.xl.md`**；探针脚本在 `tmp/`（gitignored，不提交）。
- **合并 base 协议**：所有功能分支都从 Lead 维护的 `_integration` 的 `integration/all-possible` 起，
  PR 回到 `integration/all-possible`；本方案分支只提交文档。

## 0. 基线复核（本方案全部结论的实测依据，2026-10-26）

| 项 | 读数 | 命令 |
| --- | --- | --- |
| 构建 | **566 written / 0 error / 3 warning**（3 条均为既有 `E1107`） | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 `out`） |
| 类型检查 | **exit 0** | `node node_modules/typescript/bin/tsc -p .` |
| 覆盖账本 | **PASS 415 / FAIL 0，exit 0** | `node typescript/cases/tts/run.mjs --quiet` |
| 分类分布 | throw 125 / atomic 192 / partial 53 / incremental 45 | 同上 `--json tmp/tts-report.json` |
| `residualBasicLines>0` | **只有 3 条**（均 `incremental`）：`incremental/declarations/let-add` +1、`incremental/lexical/comment-block-around-operator` +1、`incremental/statements/let-continuation-number` +1 | 同上 JSON |
| `rangeOnlyDifference` | **94 条**（两种模式 EOF 形状树相同，仅 `src` 区间含前导/尾随 trivia） | 同上 JSON |
| `partial` 的提前节点 | **53/53 条 = 只有骨架**（`nonSkeletonEarlier = 0`：三层声明容器 + 绑定名） | 同上 JSON |
| `throw` 文案 | **38 组**（最大组：`declaration 括号` 37 条、`符号 .` 9、`解构绑定` 8、`符号 :` 7、`符号 !` 6、`运算符 <` 5、`符号 ;` 4、`运算符 -` 4、`符号 }` 4…） | 同上 JSON（逐条清单见 `tmp/agg-out.md`，**不入库**） |
| `tts-impl` | **不存在**（本方案定义它，见 §2.4） | — |
| `feas-*` | 5 个文件，`FeasOperatorParser` 全仓**无调用点**，原型 6 例 4 过 2 挂（`a+b*c`） | `grep FeasOperatorParser` |

> 复算提示：`--quiet` 模式在 0 失败时**只静默 exit 0**（不打印汇总行），要读数必须看退出码或加 `--json`。
> 这是 README 未写明、容易被误判成「没跑」的坑。

---

## 1. 现状架构（三条路径 + 开关 + 唯一需要接线的洞）

### 1.1 逐字符驱动与三条建树路径

驱动链（`run.mjs` 与 `cjcli` 同源）：`SyntaxContext.ProcessRange(Root, [i,i+1), i)` → 每个字符一次
`ComputePossibleShapes` → 每步 `Root.ToAstLine(0)` 取树；最后压游标到 `count` 做 EOF 收尾。
**账本判据只认「树里最早出现的步号」**，所以「内部已经算出形状、但没挂进树」= 不算增量（见 1.3 的 `OperatorBody`）。

```text
SourceFileShape（根）
 └─ StatementPossibleShape.ComputeByIndex         ← 路由：StatementRouteUtil.Decide
     ├─ ShellVariable（let/const/var）
     │   └─ VariableStatementPossibleShape ─→ VariableDeclarationListShape ─→ VariableDeclarationShape
     │         └─ CatalogGuide(ExpressionCatalogFactory.Create(), endPossible)   ★ 唯一的增量表达式目录
     │               ├─ NumericLiteralPossibleShape        （数字字面量）
     │               └─ BinaryExpressionPossibleShape      （只支持 * 、+；BuildOperator 只认这两个）
     │                     └─ CatalogGuide(RightOperandPossibleShape.Catalog(), null)
     ├─ ShellPlainExpression（裸表达式语句 a<b&&c>d;）
     │   └─ RootExpressionStatementPossibleShape.BuildByIndex
     │         └─ StatementShape(Kind=ShellPlainExpression)
     │               ├─ CatalogGuide([], StatementEndPossibleShape)   ★★ 空目录 —— 这就是要填的洞
     │               ├─ OperatorBody = StatementOperatorBody           （token 级表达式状态机，见 1.3）
     │               └─ DirectSession = DirectBuildRouter.Create(...)  （当前 plugins 空表 ⇒ null）
     └─ Legacy（其余全部语句族）
         └─ StatementPossibleShape 原子建树：StatementScanner 判「语句完整」→ StatementBuilder.Load + BuildStatement
```

收口：`StatementShape.BuildFromShell`（`statement-shape.xl.md:95-289`），四条分支按序：
`DirectSession.Finish` → **`builder.BuildExpressionStatementFromShapes(shell.OperatorBody)`（S3c，已存在）** →
`VariableStatementThreeLayer.TryBuild` → `StatementFamilyDispatch.Build` / `builder.BuildStatement()`（legacy fallback）。
`FinishShell`（`:293+`）负责 leftover 重放与壳换出。

另外两条**原子**路径（不经过 `StatementPossibleShape`）：声明族（class/function/import/export/interface/enum/
type alias/namespace，`typescript/tokens/declarations/*-possible-shape.xl.md`）与类型上下文
（`typescript/tokens/types/*-possible-shape.xl.md`）。它们各自也有 `PossibleShape` 入口，但 `BuildByIndex`
走的是「收口时整段建树」——这正是 192 条 `atomic` 的来源。

### 1.2 开关的真实作用

`typescript/tokens/statements/statement-route-util.xl.md`：

| 字段/方法 | 默认 | 作用域（实读） |
| --- | --- | --- |
| `EnableShellExpressions:bool` | **true** | 控制「是否用语句壳 + 路由」。`StatementPossibleShape` 在 true 时按 `Decide` 分流，false 时用 Wave1 内联分流 |
| `EnableIncrementalVariableShapes:bool` | **false** | **只作用于 `let/const/var` 声明族**（`VariableStatementPossibleShape` 分流到增量分支） |
| `IsIncrementalVariableShapesEnabled()` | — | 唯一读入口 |
| `EnableDeclarationShell` / `EnableRootDeclarationShell` / `EnableControlFlowShell` | 未见关闭 | 声明壳/控制流壳的启用位（与本次目标正交） |

因此：**`a < b && c > d;` 与 `if (a) b;` 在两种模式下树都只有 `StatementShape` + basic token，EOF 才出完整树** ——
不是开关没打开，而是「裸表达式/其它语句族」根本没有逐字符形状路径可打开。

### 1.3 `OperatorBody`：已经存在但**没挂进树**的表达式形状机（本方案最大的既有资产）

`StatementOperatorBody`（`statement-operator-body.xl.md`，71KB）是逐 token 的表达式状态机，能力覆盖：

- `Frames` / `FramePrecs` / `FramePending`：**运算符优先级爬升栈**；`PushOperator(precedence, rightAssoc)`、
  `AttachOperand(built)`、`CompleteTop()`、`PushAssignment`、`StartConditional/CloseConditional`、
  `StartPostfix`、`StartCall/StartIndex`、`StartMember`、`StartNew/NewTarget`、`StartAwaitYield`、
  `StartNonNull`、`StartTypeAssert`、`TrackTypeTail`、`StartArrow`、`StartTaggedTemplate`、`IngestBody`。
- `IngestAll(units, template)` / `Ingest(unit, template)` / `Finish()` / `IsComplete()`。

它**已经在** `RootExpressionStatementPossibleShape.BuildByIndex` 里被挂到壳上（`shell.OperatorBody = new
StatementOperatorBody(...)`），并且 `StatementShape.ComputePossibleShapes` 每个新单元都
`OperatorBody.IngestAll(this.Data, ...)`（`statement-shape.xl.md:89-91`）；收口时 S3c 用
`StatementShapeAst.Build / BuildNode` 把它的形状树转成 AST（`statement-shape-ast.xl.md:64`）。

**但它把形状留在自己的 `Frames` 里，没有作为子单元挂进 `StatementShape.Data`** ⇒ `ToAstLine` 看不到 ⇒
账本判 `atomic`。这就是「全场景增量」最便宜的一刀：**让 OperatorBody 在归约的同一时刻把形状物化并挂进壳的
可见子单元**，而不是等收口再转 AST。同理，声明族的初始化器也可以改成「同一个 OperatorBody + 形状物化」。

### 1.4 `CatalogGuide` / `PossibleShape` / `PossibleShapeCache` / `Pos` 约定（实现者必读）

- `PossibleShape` 三入口：`ComputeByIndex(units,tokenIndex,cache)=>ShapeStates`、`IsBuildable(...)`、
  `BuildByIndex(host,tokenIndex,catalog,context)=>Token`。
- `ShapeStates`：`Accept` / `Reject` / `Uncertain`。**`Reject` 是永久的**（`CatalogGuide` 只在建出形状后
  `Reset()` 重填 Candidates）；「现在建不了但以后可能」必须 `Uncertain`。踩过：char 6 `=` 若 `Reject`，
  char 8 的数字永远等不到 `Accept`（C 契约「最终实现与实测坑 §1」）。
- `PossibleShapeCache`：`Values` 逐条目状态（`GetState/SetState`，`CatalogGuide.Reset()` 后清空）、
  `Share` 跨条目共享（`GetShare/SetShare`，**必须自带新鲜度判据**）、`GetItemStart/SetItemStart`
  （统一走 `ItemUtil.ItemStartCached(units, cache)`）。
- 槽位用 `this.Slot()`，**禁止**用 `constructor.name` / 字符串键（同时满足 direct:lint 安全规则 C5：
  禁止 `ctx.Text/ctx.TextOf/ctx.StringText/ctx.source`）。
- `Pos`（C1 口径，两种模式必须逐位一致）：`Pos` = 前一个非 trivia 单元的 `SourceRange.EndIndex`，首个为
  `0`；块内第一条语句 `= 宿主 '{' 的 StartIndex + 1`；`src` 起点 = 首个代码字符（跳过前导 trivia），
  `src` 终点 = 最后一个代码子单元的 `EndIndex`。**`Pos` 是账本的节点 identity**，`src` 只在 94 条
  `rangeOnlyDifference` 里漂（既有实现缺陷，§2.3 单列收尾）。
- `Parent` / `MountedUnit` / `Replace` / `Quit` / `MoveDataTo` / `Reload`：形状换出与卸载语义见
  `token.xl.md` / `unit-token.xl.md`；「建形状后原地替换左操作数那一格 + `host.MountedUnit = 新形状`」
  是既有惯用法（`binary-expression-possible-shape.xl.md:100-107`）。

### 1.5 `feas-*` 原型评估（结论：**不接线，降级为参考实现**）

5 个文件，`FeasOperatorParser`（优先级爬升 + `OperatorTable` + `ExpressionBuilder`）、
`FeasRawTokenHost`、`FeasPrefixUnaryPossibleShape`、`FeasOperandPossibleShape`、
`FeasBinaryOperatorPossibleShape`（三个 `Feas*PossibleShape.BuildByIndex` 直接抛「原型由 FeasOperatorParser
增量建形状」）。全仓**无调用点**，`tests/feas-operator/harness.mjs` 6 例 4 过 2 挂（挂在 `a+b*c` 形态）。

- 它的**价值**：`OperatorTable`（优先级/结合性单一来源）与「优先级爬升」的判据写法已验证；`FeasOperatorParser`
  的整段解析思路可作 E-base 归约栈的参照。
- 它的**问题**：它是「喂完整段 units 再解析」，不是可重入的逐字符状态机；而且它自己没接 `CatalogGuide` /
  `PossibleShapeCache`，形状也没有 `Pos` 口径。**改造它 = 重写它**，成本高于基于 `StatementOperatorBody`
  （已接线、已覆盖 90% 表达式形态、已有 S3c 形状→AST 桥）。故：`feas-*` 保持现状，标 `@deprecated`
  不许删除、不许接线；E-base 只复用 `OperatorTable`。

---

## 2. 目标定义（可执行，Lead 已裁决）

### 2.1 一句话目标

**`typescript/cases/tts` 的 415 条 case 全部达到 `incremental`，且两种模式 EOF shape 树逐节点一致；
达成一条就从 `tts` 迁到 `tts-impl`，最终 `typescript/cases/tts/cases/` 为空。**

### 2.2 硬判据（全部可机械复算）

一条 case 算「支持」，必须同时满足：

1. `node typescript/cases/tts/run.mjs --show <case>` → `expected=incremental actual=incremental pass=true`；
   分类判据即 §0 的账本口径（legacy vs incremental 同进程各跑一遍，比较 EOF 树各 shape 节点的首次出现步号，
   shape 节点 = 非 basic token；identity = `(类名, pos)`；**strictly earlier** 才算增量）。
2. `actual` 不得是 `throw` / `atomic` / `partial` / `divergent` / `invalid`：
   - `divergent`（两模式 EOF 形状树不同）= **硬失败**，直接违反 C6/C10；
   - `invalid`（legacy 自己抛错 / TS 语法不合法）= 硬失败。
3. `tsValid === true`（TS 语法合法，`run.mjs` 内置体检）。
4. EOF 树一致性口径（与 `run.mjs` 的 `shapeLines` 完全一致，实现者照此对齐）：
   - **参与比较**：非 basic 节点行的 `类名 + pos + 文本字段`（`src=[..)` 被正则剥掉）；
   - **不参与比较**：basic token 行（`Common`/`Symbol`/`WrapSymbol`/`Bracket`/`String`/…）与 `src` 区间；
   - 因此 **`src`/前导尾随 trivia 的差异不算 divergent**（94 条既有 `rangeOnlyDifference` 仍算 PASS）。
5. `residualBasicLines` 只作 **warning**：记录、出报表、单列收尾 WP，**不作 hard gate**（目标 residual==0）。
   当前基线 3 条（`incremental/declarations/let-add`、`incremental/lexical/comment-block-around-operator`、
   `incremental/statements/let-continuation-number`，各 +1）。
6. 确定性：同一命令两次独立进程的 `--json` 输出逐字节相同（既有能力，须保持）。
7. **禁止**用「吞掉形态、退回 legacy/direct」换绿：未支持形态必须显式
   `throw new Error("增量变量形状未支持：<阶段> <形态>")`（C10，Lead 裁决 §6.3）。显式 throw 的 case 在迁移
   完成前允许继续留在 `throw/` 目录（账本标注如实更新），但**不得**出现「树不同却判绿」。

### 2.3 `src`/trivia 缺陷的容忍边界（为什么它不算 divergent，却仍要修）

既有增量实现有 4 个缺陷（README「顺带发现的增量实现缺陷」）：(1) 增量声明之后跟第二条语句整段丢失；
(2) 数值左操作数后 `/` 被当正则；(3) 二元 `Data` 残留 trivia（= `residualBasicLines`）；(4) 语句/声明 `src`
吞前导与尾随 trivia（= `rangeOnlyDifference` 94 条）。

- **容忍边界（不阻塞主目标）**：只影响 `src` 端点或残留 basic 行的差异。因为账本用 `pos` 做 identity、
  比较时剥 `src`、忽略 basic 行，它们不改变「形状结构」。
- **必须修（单列 WP，目标 0）**：`residualBasicLines == 0`（缺陷 3）、`rangeOnlyDifference == 0`（缺陷 4）。
  两项目标都在 Phase B 之后收口，不进主链验收；但**新写的路径一开始就必须按 C1 口径设 `src`**
  （`src` 终点 = 最后一个代码子单元 `EndIndex`，不吸尾随 trivia），不许把缺陷当规范复制。
- **硬红线**：缺陷 1、2 是 `divergent`（静默产出错树），任何 WP 不得把它们收成 case 或写进期望；遇到时必须
  显式 throw（缺陷 1 在 Phase B 的 ASI/多语句 WP 一并解决，缺陷 2 在 token 化层解决，见 B6）。

### 2.4 `tts-impl` 迁移口径（逐条迁移，不做一次性搬运）

- 新建 `typescript/cases/tts-impl/`：
  ```text
  tts-impl/
    run.mjs                 # 由 tts/run.mjs 裁剪：EXPECTED 恒 incremental；case id = <area>/<name>
    README.md               # 只写「已支持 = 必须 incremental」的验收口径
    cases/<area>/<name>.ts  # 平铺 area（statements|declarations|expressions|types|lexical|controls）
  ```
- `tts-impl/run.mjs` 的硬断言：`actual === "incremental"` **且** `pass`；`residualBasicLines` 打印 WARN
  （不 fail）；`divergent`/`invalid`/`throw` 一律 FAIL 且 exit 1。
- 迁移动作（每条 WP 在自己验收里批量做，**不要抢别人的 area**）：
  1. `git mv typescript/cases/tts/cases/<class>/<area>/<name>.ts typescript/cases/tts-impl/cases/<area>/<name>.ts`
  2. 改 `tts/cases/` 剩余目录标注（class 目录名就是标注）；`INDEX.md` **只在最终 WP（B7）** 重跑
     `--write-index`，避免多人同时改生成物。
- `tts/run.mjs` 保留为「未支持账本」直到空集；最终态：`typescript/cases/tts/cases/` 为空目录，
  `run.mjs` 对空集 exit 0（需加一行「空目录 = 全部迁完」的友好提示），README 改成历史说明。
- **迁移原子性**：一个 case 只有在同一分支上 `--show` 报 incremental 后才能 mv；mv 与实现同一个 commit/PR。

### 2.5 两阶段分期（Lead 裁决）

| 阶段 | 规模 | 语法上下文 | 关键前提 |
| --- | --- | --- | --- |
| **Phase A** | **178** = throw 125 + partial 53 | 全部落在 **`let/const/var` 声明上下文**（初始化器为各种表达式、或声明本身不完整：解构/多声明/分号/类型注解） | 现有三层声明骨架已增量，只差「初始化器 + 声明收口」的表达式目录 |
| **Phase B** | **192** = atomic 192 | **没有任何变量声明**的裸语句/声明/类型（`a<b&&c>d;`、`if(a)b;`、`class C{}`、`type T = …`、纯词法形态） | 需要**新开关** `EnableIncrementalShapes` + 各语句族/声明族/类型族的 `CatalogGuide` 接线 |

`incremental` 45 条是**回归基线**：两个阶段都不许把它们降级（任何 WP 验收都先跑全量 415 账本，
只允许目标 case 的标注按计划变化，其余逐条不变）。

---

## 3. 缺口清单（按分区，含需要的新 possible / shape / 注册点）

分区口径与 README 表一致（逐条清单 `git ls-files typescript/cases/tts/cases`；`INDEX.md` 有逐条判定依据）：

| 分区 | throw | atomic | partial | incremental | 合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| statements | 9 | 65 | 3 | 3 | 80 |
| declarations | 20 | 59 | 7 | 4 | 90 |
| expressions | 66 | 0 | 23 | 11 | 100 |
| types | 18 | 54 | 8 | 0 | 80 |
| lexical | 12 | 14 | 12 | 22 | 60 |
| controls | — | — | — | 5 | 5 |
| **合计** | **125** | **192** | **53** | **45** | **415** |

### 3.1 expressions（100 = throw 66 + partial 23 + incremental 11）

现状：`ExpressionCatalogFactory.Create()` 只有 `NumericLiteralPossibleShape` + `BinaryExpressionPossibleShape`；
`BuildOperator` 只认 `*`/`+`；二元候选在「新运算符结合更紧」时显式抛错（`bin-add-mul` 的文案
`expression 新运算符结合更紧（优先级 14）` 即此）；其余全部落在 38 组 throw 文案里。

| 构造组 | 目标 case（代表） | 需要什么 |
| --- | --- | --- |
| 全部二元运算符（`- % ** << >> >>> < > <= >= == != === !== & \| ^ && \|\| ??`） | throw/expressions `bin-*` 22 条 + `throw/declarations/let-subtract-init`、`let-exponent-init` | `OperatorShapeMap`（Symbol→运算符形状单一分支点，缺口 30+ 个 `*-token-shape` 多半已存在）+ E-base 归约栈（含**再结合**） |
| 一元/前缀/后缀/update（`+ - ! ~ typeof void delete ++ --`） | throw/expressions `unary-*` 5 + `update-*` 4 + `unary-delete` | 前缀候选（`PrefixUnaryPossibleShape`）+ 后缀候选（`PostfixPossibleShape`）；`delete` 依赖成员访问 |
| 括号与再结合 | `bin-paren-mul`、`paren-nested`、`paren-as-init` | `ParenthesizedExpression` 形状（类名必须与 legacy 一致）+ 归约栈的「括号层不参与优先级」 |
| 主表达式：标识符/字符串/模板/regex/bigint/布尔/null/undefined/this | partial/expressions `lit-*` 12、`ref-ident`、`ref-this`；partial/declarations 7；partial/lexical 12 | 各自的 `<form>-shape-possible.xl.md` 片段（`type` 面与 `string` 面已存在 `*-shape`，补 possible 候选） |
| 成员/下标/调用/构造/可选链/非空/new/import.meta/super/private | throw/expressions `ref-*` 9 + `unary-delete`；throw/lexical `let-init-member-keyword` | `PostfixPossibleShape` 族：`.` / `?.` / `[` / `(` / `!` / 类型实参 `<` |
| 复合字面量与函数式 | `arr-literal`、`spread-array`、`obj-literal`、`spread-object`、`computed-key`、`method-shorthand`、`getter`、`setter`、`class-expr`、`func-expr`、`arrow-*` 8、`yield-expr`、`await-expr` | `PrimaryPossibleShape` 分派树（`{`/`[`/`(`/`function`/`class`/`async`/`yield`）——**其中括号歧义要复用 `ParenFeedsArrow` 判据** |
| 逗号/序列/三元 | `comma-expr`、`seq-three`、`ternary` | `SequencePossibleShape` + 条件运算符归约（`OperatorTable` 的 conditional 优先级） |
| `as` / `satisfies` / 尖括号断言 / 泛型实参 | throw/types 18 全组、`throw/expressions/angle-assert`、`as-const`、throw/lexical `let-type-annotation` | **类型目录**（§3.4）与表达式归约栈的联动：`as` 是二元级运算符、尖括号断言是「前缀类型 + 表达式」 |

### 3.2 declarations（90 = throw 20 + atomic 59 + partial 7 + incremental 4）

- **Phase A（throw 20 + partial 7）**：三层声明骨架已增量，缺的是：
  - 绑定形态：`array-binding-pattern` / `object-binding-pattern` / `binding-element`（已有 shape 与 possible
    文件，缺**增量 possible 候选**）：解构 8 条（含 default/nested/rest）；
  - 声明列表：多声明 `,`（`let-two-declarations`、`var-two-initialized`、`let-init-multi-decl`）、
    `let-semicolon-*`（当前 `;` 直接 throw）、无初始化器（`let x: T`）、`let x! = …`；
  - 类型注解 `:`（7 条）→ 依赖 §3.4 类型目录；
  - 初始化器全部形态 → 依赖 §3.1。
- **Phase B（atomic 59）**：class（14）、function（10）、enum（4）、declare 修饰族（5）、
  module/namespace（4）、import（11）、export（5）、interface（9 与 types 重叠）。
  每条现在走各自的 `*-possible-shape` 的 `BuildByIndex` 原子建树；需要给每族加「壳 + CatalogGuide」的逐字符
  路径：`ClassDeclarationPossibleShape`、`FunctionDeclarationPossibleShape`、`InterfaceDeclarationPossibleShape`、
  `EnumDeclarationPossibleShape`、`ModuleDeclarationPossibleShape`、`ImportDeclarationPossibleShape`、
  `ExportDeclarationPossibleShape`，并在 `statement-family-dispatch` 之外新增 family 壳路由
  （`StatementRouteUtil.Decide` 的 `ShellClassDeclaration` / `ShellFunctionDeclaration` 已有雏形）。

### 3.3 statements（80 = throw 9 + atomic 65 + partial 3 + incremental 3）

- **Phase A（throw 9 + partial 3）**：全是「块/嵌套语句体内含一条变量声明」——
  `if-block-let-*`、`while-block-let-close-brace`、`function-body-let-close-brace`、`try-block-let-type-annotation`、
  `label-block-let-unary-init`、`do-while-let-call-init`、`asi-two-declarations` 等。
  它们真正缺的是「**块体/子语句体的逐字符形状**」（`block-possible-shape.xl.md` 39KB 已有块级扫描，
  但 `BlockShape` 的 `BuildByIndex` 是原子），加上 `;`/`}` 收口与 ASI。
- **Phase B（atomic 65）**：裸表达式语句 `expr-*` 35 条 + 控制流 if/while/for/switch/try/块/标签/跳转约 30 条。
  裸表达式语句只需把 `RootExpressionStatementPossibleShape` 的空 CatalogGuide 换成 `ExpressionShapeCatalog`
  （E-base 一份目录，54 行接线量），是 Phase B 里投入产出比最高的一批；控制流需要每族一个「壳 + 子句目录」。

### 3.4 types（80 = throw 18 + atomic 54 + partial 8 + incremental 0）

**没有任何类型上下文是增量的**（类型目录整个缺失）。需要新建类型候选目录（`TypeCatalogFactory`）：
类型引用/限定名、字面量类型、union/intersection、array/tuple（named/optional/rest）、function/ctor 类型、
parenthesized、type operator（keyof/typeof/readonly/unique）、indexed access、conditional/infer、
mapped/remap/modifiers、template literal、type query、import type、predicate、`as`/`satisfies` 的断言面。
目标 case：atomic/types 54 + throw/types 18 + partial/types 8 = 80 条。

### 3.5 lexical（60 = throw 12 + atomic 14 + partial 12 + incremental 22）

大部分 `incremental`（22）已绿，剩：trivia 与 token 化缺陷（`/` 正则歧义 → 缺陷 2、`residualBasicLines` → 缺陷 3、
`src` 吞 trivia → 缺陷 4）、`;`/ASI（`asi-*`）、`!`/`<`/`>>`/`++` 的 token 歧义。
**这区不新写形态**，是 B6「词法/trivia 收口 WP」的目标，且与缺陷 1（增量声明后跟第二条语句整段丢失）强耦合。

### 3.6 controls（5）

现有 5 条全绿（`let/const/var` + 数字/`+`/`*` 的样本族，含目标样本本身 `let-mul-add.ts` 13 字节无尾随换行）。
**唯一要求：任何 WP 不许降级**。B7 收尾时随其余 case 一起迁 `tts-impl`。

---

## 4. WP 拆分（每个 WP 目标：一个 10 回合智能体 ≤8 轮完成）

### 4.0 通用验收模板（下称 **TC**，每个 WP 都包含，不再逐条重复）

```powershell
# 0) 构建（DSH 工具，不传 out；产物落 dist/ts，tsc 再编到 build/ts）
xl_build { cwd: "<本分支克隆>", paths: ["core","typescript"], targets: ["ts"] }
node node_modules/typescript/bin/tsc -p .                       # 必须 exit 0
# 1) 账本：全部 415 条必须仍 exit 0（目标 case 的标注可按计划改动，其余逐条不变）
node typescript/cases/tts/run.mjs --quiet --json tmp/tts-<WP>.json
# 2) 回归差异：只允许本 WP 的目标 id 变化（E0a 提供工具 typescript/cases/tts/tools/diff-report.mjs）
node typescript/cases/tts/tools/diff-report.mjs tmp/base.json tmp/tts-<WP>.json --allow <本 WP 目标 id…>
# 3) 单条证据
node typescript/cases/tts/run.mjs --show <case>
# 4) 迁移过的 case（有迁移的 WP 才跑）
node typescript/cases/tts-impl/run.mjs --quiet                  # 必须 exit 0
```

- **禁止**：`npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*` / `cases:*`（本阶段禁跑既有 gates）。
- 允许：`node tests/parse/token-time-shapes.mjs …`（契约 C7 的既有验收工具，非 gate）。
- 每个 WP 只提交自己 `own` 的文件；报告写 `_coord/REPORT-all-possible-<WP>.md`（各自独占）。
- **超过 8 轮的统一交接协议**：在 round 6 之前 commit 一个「可构建、账本仍全绿、目标未全达成」的检查点，
  写报告三件事（已完成 / 未达成 + 当前 `--show` 输出 / 下一步从哪里继续），后继 WP 从
  `integration/all-possible` 的该 commit 拉分支继续；**不留半成品树、不把失败 case 改标注**。

### 4.1 WP 总表

| WP | 名称 | 目标 case（精确数量） | 新建（own） | 修改（own） | 依赖 | 轮 |
| --- | --- | --- | --- | --- | --- | --- |
| **E0a** | 表达式地基（归约栈 + 候选协议 + 探针工具） | 无（只建地基；回归 45 条 incremental） | `expressions/shape-operator-stack.xl.md`、`expressions/expression-shape-catalog.xl.md`（骨架）、`expressions/operator-shape-map.xl.md`、`cases/tts/tools/expr-probe.mjs`、`cases/tts/tools/diff-report.mjs` | `expressions/operator-table.xl.md`（只加 `IsRightAssociative`，锚点 `[E-OPTABLE:ASSOC]`） | — | 7 |
| **E0b** | 声明初始化器接线（Phase A 总闸） | 让 `let x = <任意已支持原子>` 走新目录；先行目标：`incremental/*` 45 条不回归 | — | `expressions/expression-catalog-factory.xl.md`（唯一所有者；`Create()` 里接 `ExpressionShapeCatalog`，锚点 `[E-CAT:REGISTER]`）、`declarations/variable-declaration-shape.xl.md`（改造 `FinishIncremental` 分支，gate 新开关） | E0a | 6 |
| **A1** | 原子操作数（字面量/标识符/字符串/模板/regex/bigint/this/undefined） | **34**：partial/declarations 7（`const-string-init`,`let-comparison-init`*，`let-identifier-init`,`let-regex-init`,`let-string-init`,`let-template-init`,`let-template-substitution-init`）、partial/lexical 12（`let-init-bigint|identifier|regex-class|regex-escaped-slash|regex-flags|string-double|string-escape|string-single|template-nested|template-plain|template-subst|template-tagged`）、partial/expressions 12（`lit-bigint|false|null|regex|string-double|string-escape|string-single|tagged|template-sub|template|true|undefined`）、partial/statements 3（`const-identifier-init`,`let-continuation-identifier`,`let-identifier-init`）= 34（`*let-comparison-init` 归 A2） | `expressions/forms/primary/*-possible-shape.xl.md`（每形态一文件） | 1 行注册（`[E-CAT:REGISTER]` 区） | E0b | 6 |
| **A2** | 运算符归约（全部二元 + 一元 + update + 括号 + 再结合） | **≈41**：throw/expressions `bin-*` 22（`add-mul,and,bitand,bitor,bitxor,eq,exp,ge,gt,le,lt,mod,ne,nullish,or,paren-mul,seq-eq,shl,shr,sne,sub,ushr`）、`unary-bnot|chain-not|minus|not|plus` 5、`update-pre-inc|pre-dec|post-inc|post-dec` 4；throw/declarations `let-subtract-init`,`let-exponent-init`；throw/lexical `let-init-lt|shift|unary-plus` 3；throw/statements `label-block-let-unary-init`；partial/expressions `bin-div|bin-in|bin-instanceof|unary-typeof|unary-void` 5；partial/declarations `let-comparison-init` | `expressions/forms/operator/*.xl.md`、`expressions/forms/paren-possible-shape.xl.md` | 1 行注册 | E0b | 8 |
| **A3** | 成员/下标/调用/构造/可选链/非空/new/import.meta/super/private | **≈18**：throw/expressions `ref-call,ref-import-meta,ref-index,ref-member,ref-new-target,ref-new,ref-nonnull,ref-optional,ref-super,unary-delete` 10；throw/declarations `let-member-init`,`let-call-init`；throw/lexical `let-init-member-keyword`；throw/statements `do-while-let-call-init`,`if-block-let-member-init`；partial/expressions `ref-ident,ref-new-no-parens,ref-this` | `expressions/forms/postfix/*.xl.md` | 1 行注册 | E0b | 7 |
| **A4** | 复合字面量/函数式/箭头/三元/逗号 | **≈31**：throw/expressions `arr-literal,spread-array,obj-literal,spread-object,computed-key,method-shorthand,getter,setter,class-expr,func-expr,arrow-async,arrow-block,arrow-default,arrow-destructure,arrow-multi,arrow-rest,arrow-single,paren-nested,comma-expr,seq-three,ternary,await-expr,yield-expr` 23；throw/declarations `let-array-init,let-arrow-init,let-parenthesized-init`；throw/lexical `let-init-object-literal`；throw/statements `while-block-let-close-brace`,`function-body-let-close-brace` | `expressions/forms/primary/{arrow,object-literal,array-literal,class-expr,function-expr,template-*}.xl.md` | 1 行注册 | E0b | 8 |
| **A5** | 类型面（注解/断言/as/satisfies/尖括号/泛型实参） | **≈32**：throw/types 18 全组（`angle-assertion,arrow-async-typed-param,arrow-typed-param,as-array-type,as-intersection-type,as-qualified-type,as-union-type,const-annotation-init,destructure-array-annotation,destructure-object-annotation,function-expression-typed-param,generic-arrow-typed-param,generic-call-type-args,let-annotation-no-init,nonnull-assertion,paren-as-init,satisfies-object-type,var-readonly-array-annotation`）；throw/declarations `let-type-annotation,let-type-annotation-init`；throw/lexical `let-type-annotation`；partial/types 8；partial/expressions `as-expr,satisfies-expr` | `types/type-catalog-factory.xl.md`（**所有者**）、`types/forms/*.xl.md` | `declarations/variable-declaration-shape.xl.md` 的 `:` 分支（**须与 E0b 串行**，见 §5） | E0b | 8 |
| **A6** | 绑定与声明列表（解构/多声明/`;`/无初始化器/`!`） | **≈25**：throw/declarations `let-array-destructure-rest,let-array-destructure,let-object-destructure-default,let-object-destructure-nested,let-object-destructure,let-semicolon-binding,let-semicolon-number,let-definite-assignment,let-two-declarations,var-two-initialized`；throw/lexical `let-init-multi-decl,let-init-semicolon,let-init-bang,asi-two-declarations,asi-postfix-newline`；throw/statements `asi-two-declarations,if-block-let-semicolon,if-block-let-destructuring`；throw/types `destructure-array-annotation,destructure-object-annotation` | `bindings/forms/*-possible-shape.xl.md`、`declarations/variable-declaration-list-possible-shape.xl.md` | 1 行注册 | E0b | 7 |
| **A7** | Phase A 收口 + 迁移 178 条 | Phase A 全量 178 条 `actual=incremental` 且迁入 `tts-impl` | `tts-impl/run.mjs`、`tts-impl/README.md` | `INDEX.md`（唯一一次重生成） | A1–A6、E0b | 6 |
| **B1** | 控制流语句族（if/while/do/for/for-in/for-of/switch/try/with/block/label/跳转/ASI） | **≈46**（atomic/statements 中除 `expr-*` 者）：`asi-newline,asi-postfix-newline,asi-return-newline,asi-same-line,block-empty,block-statements,break-label,break,continue,debugger,do-while,empty-statement,for-classic,for-empty-clauses,for-head-let-atomic,for-in,for-of-const,for-of,if-else-block,if-else-if-chain,if-no-block,label-block,label-nested,return-no-value,return-value,stmt-async-function,stmt-let-as-identifier,stmt-object-vs-block,stmt-with,switch-case-let-atomic,switch-fallthrough,switch-single-case,throw-new,try-catch-nobind,try-catch,try-finally,while-block,while-no-block,stmt-array-literal-start,stmt-object-literal-paren` 等 | `statements/forms/*-possible-shape.xl.md`（每族一文件）、`statements/statement-shell-catalog.xl.md` | `statement-route-util` 由 **Lead/bootstrap** 改（§5）；`statement-shape.xl.md` 只由 **B2** 改 | E0a | 8 |
| **B2** | 裸表达式语句族（`expr-*` + 词法表达式） | **≈49**：atomic/statements `expr-arrow,expr-assign,expr-await,expr-binary-arithmetic,expr-binary-bitwise,expr-binary-comparison,expr-binary-logical,expr-call,expr-class-expr,expr-comma,expr-function-expr,expr-index,expr-literal,expr-member,expr-new,expr-nonnull,expr-optional-chain,expr-regex,expr-spread-array,expr-template,expr-ternary,expr-unary,expr-update-postfix,expr-yield` 24 + `stmt-*` 剩余优先级归 E-base 后自动达成者；atomic/lexical `expression-angle-chain,expression-array-literal,expression-async-arrow,expression-block-comment-between,expression-call-type-args,expression-let-identifier,expression-new-call,expression-object-in-paren,expression-optional-ternary,expression-paren-arrow,expression-paren-assign,expression-paren-sequence,expression-shift-generic` 13 | — | `statements/root-expression-statement-possible-shape.xl.md`（唯一所有者：空目录→`ExpressionShapeCatalog.CreateStatement()`）、`statements/statement-shape.xl.md`（H1 挂载点，锚点 `[E-SHAPE:MOUNT]`） | E0a | 8 |
| **B3** | 函数/类/枚举/declare/namespace 声明族 | **≈37**：atomic/declarations `class-*` 14、`function-*` 10、`enum-*` 4、`declare-*` 5、`module-shorthand`、`namespace-basic`,`namespace-nested`,`namespace-export-function` | `declarations/forms/*-possible-shape.xl.md` | 各自 `*-possible-shape.xl.md` 的 `BuildByIndex` 增量分支（own 文件即可） | E0a | 8 |
| **B4a** | 接口 + 类型目录骨架 | atomic/declarations `interface-*` 9 + `types/type-catalog-factory.xl.md` 基座（与 A5 共用，A5 先建则 B4a 扩） | `types/type-catalog-factory.xl.md`（A5 已建则只扩，须串行） | — | A5 | 6 |
| **B4b-i** | 类型形态 I（引用/字面量/union/intersection/array/tuple/函数/构造/括号/type-operator/indexed） | **≈27**：atomic/types `alias-array,alias-fn-type,alias-fn-type-generic,alias-indexed-access,alias-intersection,alias-keyof,alias-literal-string,alias-parenthesized,alias-primitive,alias-readonly-array,alias-reference,alias-tuple,alias-tuple-named,alias-tuple-optional,alias-tuple-rest,alias-typeof-query,alias-union,alias-object*` 子集、`function-param-return,function-predicate,function-this-param,class-ctor-param-property,class-implements-multi,class-property-definite,class-property-readonly,enum-string,for-init-annotation` | `types/forms/*.xl.md` | 1 行注册（`[T-CAT:REGISTER]`） | B4a | 7 |
| **B4b-ii** | 类型形态 II（conditional/infer/mapped/remap/modifiers/template/import/infer-constraint/asserts/predicate/ctor-type） | **≈27**：atomic/types `alias-asserts,alias-conditional,alias-conditional-infer,alias-ctor-type-abstract,alias-generic-args,alias-generic-default,alias-import-type,alias-infer-constraint,alias-mapped,alias-mapped-modifiers,alias-mapped-remap,alias-object-call-construct,alias-object-index-readonly,alias-object-method,alias-object-optional-readonly,alias-predicate,alias-recursive,alias-template-infer,alias-template-literal,as-expression-statement,catch-clause-annotation,declare-unique-symbol,import-inline-type,interface-basic,interface-extends-multi,satisfies-expression-statement` | `types/forms/*.xl.md` | 1 行注册 | B4a | 7 |
| **B5** | import/export 声明族 | **≈16**：atomic/declarations `import-default-named,import-default,import-equals-qualified,import-equals-require,import-inline-type,import-named,import-namespace,import-side-effect,import-type-only,export-as-namespace,export-assignment,export-declare-const,export-named-from,export-star-as,import-attributes?`（以 `git ls-files` 为准） | `declarations/forms/import-export-*.xl.md` | 各自 possible 的增量分支 | E0a | 6 |
| **B6** | 词法/trivia/ASI 收口（缺陷 1/2/3/4） | 目标：`residualBasicLines == 0` 且 `rangeOnlyDifference == 0`（94+3 条清零）；缺陷 1「增量声明后第二条语句丢失」不再 divergent；缺陷 2 `/` 正则歧义 | `syntax/*` 之外不新增（typescript 层）`expressions/forms/token/*`、`trivia/` 修补 | `/` 的 token 化点、`Common.Close` 的收口时机、`Binary` 的 `Data` 清理（均在既有文件，**须 Lead 指定唯一所有者**） | A7、B2、B4b-* | 8 |
| **B7** | 全量收尾 + 最终迁移 + 文档 | 192 条 atomic 达成 incremental；`tts/cases` 清空；415 条全在 `tts-impl` | — | `tts/run.mjs`（空集友好提示）、`tts/README.md`、`tts-impl/README.md`、`INDEX.md`、`docs/token-time-shapes-incremental.md` 更新 | 全部 | 6 |

> 数量小计核对：Phase A = E0b 之外的 A1 34 + A2 41 + A3 18 + A4 31 + A5 32 + A6 25 = 181（有重叠项按「先到先得」，
> 以 A7 收口时 `tts/run.mjs --json` 的 178 为准；每个 WP 开工前用 `--show` 逐条确认归属，**归属冲突写进 PR 描述**）。
> Phase B = B1 46 + B2 49 + B3 37 + B4a 9 + B4b-i 27 + B4b-ii 27 + B5 16 = 211（同理，以 192 为准）。

### 4.2 建议波次与合并顺序（先地基后扇出）

| 波 | 并行 WP | 合并顺序 | 说明 |
| --- | --- | --- | --- |
| **W0** | E0a | 1 | 地基，串行；`diff-report.mjs` / `expr-probe.mjs` 是后续所有 WP 的验收工具 |
| **W1** | E0b、B2、B1、B5 | E0b → B2 → B1 → B5 | E0b 建「总闸」，B2 是 Phase B 最快见效的一刀（49 条），B1/B5 与表达式目录互不重叠 |
| **W2** | A1、A2、A3、A4、A5 | A1 → A3 → A4 → A2 → A5 | 5 个 form 智能体只写 own 片段 + 各 1 行注册；A5 与 E0b 的 `variable-declaration-shape` 修改**串行**（A5 在 E0b 合并后 rebase） |
| **W3** | A6、B3、B4a | A6 → B3 → B4a | A6 收 Phase A 边角；B3 声明族；B4a 类型基座（A5 的类型目录在此扩） |
| **W4** | A7、B4b-i、B4b-ii、B6 | A7 → B4b-i → B4b-ii → B6 | A7 迁 178 条并冻结 Phase A；两个类型形态 WP 只写 own `types/forms/*`；B6 收 `src`/trivia |
| **W5** | B7 | 最后 | 迁 192+45 条，`tts` 清空，文档/INDEX 定稿 |

**合并纪律**：每个 WP 一个分支 → PR 到 `integration/all-possible`；Lead 是唯一 merge sheriff。同一文件同一时刻只有一个
WP 在写（§5 表）；W2 的 5 个 form WP 唯一共享点是 `expression-shape-catalog.xl.md` 的**追加式注册区**（只追加、
不排序、不删别人的行；合并时把 5 行按 WP id 排序）。

---

## 5. 共享文件冲突策略（机械可解）

### 5.1 文件所有权与锚点

| 文件 | 唯一所有者 | 追加/修改锚点 | 规则 |
| --- | --- | --- | --- |
| `statements/statement-route-util.xl.md` | **Lead/bootstrap**（新开关落地者） | `EnableIncrementalVariableShapes` 字段之后加 `EnableIncrementalShapes`；`IsIncrementalVariableShapesEnabled()` 之后加 `IsIncrementalShapesEnabled()`，注释标记 `// [XL-SWITCH]` | 其它 WP **一行都不改**；需要读开关一律调 `IsIncrementalShapesEnabled()` |
| `expressions/expression-catalog-factory.xl.md` | **E0b** | `shapes.push(new BinaryExpressionPossibleShape());` 之后追加注册区，注释标记 `// [E-CAT:REGISTER]` | 其它 WP 不得改本文件；form WP 改的是 `expression-shape-catalog.xl.md` 的注册区 |
| `expressions/expression-shape-catalog.xl.md` | **E0a**（骨架）/ 全体 form WP（**只追加**） | 文件末尾注册区 `// [E-CAT:FRAGMENTS] 以下是各形态片段，每行一个，按 WP id 排序` | 每行进一个 form WP，格式固定：`  <Fragment>.AppendTo(shapes); // [<WP>]`；合并时按 WP id 排序，不重排别人的行 |
| `statements/root-expression-statement-possible-shape.xl.md` | **B2** | `shell.CatalogGuide = new CatalogGuide([], endShape);`（约 :161）与 `shell.OperatorBody = …` 之间，注释标记 `// [E-STMT:CATALOG]` | 只有 B2 改；其它 WP 需要「裸表达式语句」时通过 `ExpressionShapeCatalog.CreateStatement()` 间接用 |
| `statements/statement-shape.xl.md` | **B2** | `this.OperatorBody.IngestAll(...)`（:89-91）之后加「形状物化/挂载」调用，注释标记 `// [E-SHAPE:MOUNT]` | E0a 只提供 API，不碰本文件；B1 也不碰（控制流走自己的族壳） |
| `statements/statement-possible-shape.xl.md` | **B1** | `ComputeByIndex` 的路由分流处（`ShellPlainExpression`/`ShellVariable` 之后追加新族），每族一行 `// [XL-ROUTE:<kind>]` | 每新增一个语句族壳，只加一行；终结候选注册同样一行 |
| `declarations/variable-declaration-shape.xl.md` | **E0b**，之后移交 A5/A6（按波次串行） | `FinishIncremental` 分支 + `:` 分支（类型注解） | 同一时刻只有一人写；A5/A6 在 E0b 合并后从 `integration/all-possible` rebase 再动 |
| `direct/direct-build-plugins.xl.md` | **默认不改**（新路径不走 `DirectBuildRouter`） | 若某族确需 direct 兜底：表尾追加一行 `// [XL-PLUGIN:<kind>]` | 同一波次内只允许一个 WP 动它；B2 是唯一可能的动者，B1/B3/B5 不得动 |
| `expressions/operator-table.xl.md` | **E0a** | 末尾加 `IsRightAssociative(text)`，注释 `// [E-OPTABLE:ASSOC]` | 其余 WP 只读（`IsBinaryOperator` / `Precedence` / `IsRightAssociative`） |
| `types/type-catalog-factory.xl.md` | **A5** 建、**B4a** 扩 | 注册区 `// [T-CAT:REGISTER]` | B4b-* 只追加各 1 行 |
| `typescript/cases/tts/INDEX.md` | **A7 / B7**（各一次） | `--write-index` 重生成 | 其它 WP 不得手改；生成物冲突一律取「最后由收尾 WP 重跑」 |
| `typescript/cases/tts-impl/run.mjs` + `README.md` | **A7** 建，**B7** 改 | — | 其它 WP 只运行、不修改 |
| `typescript/cases/tts/cases/<class>/<area>/` | **按 area 归属给 WP**（$4.1 目标清单） | 只允许 `git mv` 自己目标的 case | 不改别人的 area；不改 case 内容（除 `--write-index` 生成物） |
| `_coord/REPORT-all-possible-<WP>.md` | 各 WP 自己 | — | 1 WP 1 文件，永不冲突 |

### 5.2 新增文件命名规范（own 文件不重叠的前提）

```text
typescript/tokens/expressions/forms/<类别>/<形态>-possible-shape.xl.md   # 候选（Compute/Build）
typescript/tokens/expressions/forms/<类别>/<形态>-shape.xl.md            # 形状类（若 legacy 没有可复用的）
typescript/tokens/types/forms/<形态>-shape-possible.xl.md
typescript/tokens/statements/forms/<族>-possible-shape.xl.md
typescript/tokens/declarations/forms/<族>-possible-shape.xl.md
```

- **一个文件一个形态**，文件名不含 WP id；新增文件只需 `import` 依赖，**不改任何既有文件**（注册除外）。
- 形状类名必须与 legacy 完全一致（见 `statement-shape-ast.xl.md` 的 `BuildNode` / `statement-builder.xl.md`
  的工厂方法），**禁止**发明新类名——账本按 `(类名,pos)` 判等，类名不一致直接 divergent。
- 需要跨文件复用判据时：放 `expressions/forms/shared/` 下（如 `primary-judge.xl.md`），由 E0a 拥有，form WP 只读。

### 5.3 冲突解决流程（给 merge sheriff）

1. 冲突只在 §5.1 的「追加式注册区」与 `INDEX.md` 生成物上发生；
2. 注册区冲突：两侧都保留，按 WP id 排序（`[A1] [A2] [A3]…`），不修改语义；
3. 生成物冲突：取任一版本后由收尾 WP 重跑生成命令（`--write-index`），**不手工合并**；
4. 任何非追加式冲突 = 所有权违规，**打回该 PR**，不改共享文件重做。

---

## 6. 关键决策（含理由与实测依据）

### 6.1 开关：新增二级开关（Lead 已裁决）

```ts
// statement-route-util.xl.md，紧随 EnableIncrementalVariableShapes 之后
## static field EnableIncrementalShapes:bool = false
## static method IsIncrementalShapesEnabled:()=>bool
```

- `EnableIncrementalVariableShapes` 语义**原义不动**（变量声明族旧增量路径，默认 false）。
- `EnableIncrementalShapes` 只门控「**新的逐字符形状路径**」：false ⇒ 一律走现行 direct/legacy 路径，逐字节不变；
  true ⇒ 新路径接管；遇到未覆盖形态显式 throw（C10）。
- 账本与 `tts-impl` 的 `setIncremental(enabled)` **同时置两个字段**（incremental 模式两者 true，legacy 两者 false），
  保证「旧路径不被新开关污染」「新路径不被旧开关误开」。
- **默认保持 false**，翻默认值的时机由 Lead 决定，前置条件：415 全绿 + 全量 gates 在增量模式下重跑通过（本阶段禁跑）。
- 为什么不是「扩展旧开关」：旧开关的语义已被 45 条 incremental case 与 C 契约钉死（只变量声明族），扩展会让
  「同一条 case 的增量程度随实现进度漂移」，账本与回归不可复现；二级开关让 Phase A/B 可独立开关、独立回滚。

### 6.2 表达式基础：**`OperatorBody` 派生 + CatalogGuide 候选**，不接 `FeasOperatorParser`、不改 direct session

依据（§1.3/§1.5 实测）：

- `StatementOperatorBody` 已经覆盖优先级/结合/条件/调用/成员/箭头/类型尾/await/yield，且**已接在裸表达式语句壳上**、
  已被 S3c 用来建 AST —— 缺的只是「形状物化 + 挂载进可见树」。
- `FeasOperatorParser` 是整段解析、未接 `CatalogGuide`/缓存/`Pos`，接它 = 重写一遍；它唯一值得保留的是
  `OperatorTable`（已在用）。故 `feas-*` 保持不接线，作为参考实现。
- direct session 是「逐格 Ingest、收口时整段建树」，**永远拿不到增量时序**；把它改成「Finish 前建」只是把原子点从
  `Finish` 挪到 `FinishShell`，账本仍然判 atomic。**不采用**。
- 结论：E-base = `PossibleShape` 候选（决定「这一格建不建、建什么」）+ `ShapeOperatorStack`（决定「建出来挂哪、
  怎么按优先级归约」）；form WP 只写候选与形状，不写归约。

### 6.3 两模式 EOF 树逐节点一致的保证

1. **节点类名与层级**以 legacy 为准：实现前先用 `--show` 打印该 case 的 EOF 树，照抄类名/嵌套；
   形状工厂复用 `statement-builder` / `statement-shape-ast.BuildNode` 的同名节点。
2. **`Pos`** 按 C1（§1.4 表）；`(类名,pos)` 是账本 identity，pos 错 = 节点对不上 = divergent。
3. **`src`** 按「起点=首个代码字符、终点=最后代码子单元 EndIndex」，**不吸尾随 trivia**（不复制缺陷 4）。
4. **不残留 intermediate 节点**：归约过程中允许出现临时形状，但收口前必须被替换/卸载；EOF 树里只能有 legacy 也有的节点
   （账本只比较 EOF 树的节点集合与顺序，多出的节点直接 divergent）。
5. **basic token 只减不增**：新路径不许把已经建好的形状退回 basic token；也不许在 EOF 树里留下 basic 行
   （`residualBasicLines` 目标 0）。
6. 证明手段：`tts/run.mjs`（账本）+ `expr-probe.mjs`（逐字符树快照 diff legacy）+ `diff-report.mjs`（跨 WP 回归）。

### 6.4 divergent 兜底：**显式 throw**（Lead 已裁决）

- 新路径遇到「不能正确建」的形态：`throw new Error("增量变量形状未支持：<阶段> <形态>")`，阶段用
  `statement|list|declaration|expression|type`，形态用符号/关键字文本（沿用既有 38 组文案的词表，便于聚合）；
- **禁止**静默退回 direct/legacy（否则账本会把「atomic 冒充增量」判绿，违反 C10 的唯一证据链）；
- throw 必须发生在**改动树之前**（先判定、后动手），避免半改状态被上层 catch 成错树。

### 6.5 迁移与终态（Lead 已裁决）

逐条迁移（§2.4）；Phase A 完成后 `tts` 只剩 192 atomic（+ 未达成者），Phase B 完成后清空；
`tts-impl` 是「已支持」的唯一权威账本；`tts` 保留为「未支持」账本直到空集，之后 `run.mjs` 打印
「全部已迁移」并 exit 0。

---

## 7. E-base 接口契约（4–6 个并行 form 智能体的唯一接口，E0a 落地）

### 7.1 文件与类

| 文件（E0a own） | 内容 |
| --- | --- |
| `typescript/tokens/expressions/shape-operator-stack.xl.md` | `class ShapeOperatorStack`：形状级运算符归约栈 |
| `typescript/tokens/expressions/expression-shape-catalog.xl.md` | `class ExpressionShapeCatalog`：目录装配点（片段注册区） |
| `typescript/tokens/expressions/operator-shape-map.xl.md` | `class OperatorShapeMap`：`Symbol → 运算符形状` 唯一分支点 |
| `typescript/cases/tts/tools/expr-probe.mjs` | 输入源码片段，输出「逐字符 + EOF」的 shape 树快照（含 legacy/incremental 两种），供 form WP 自测 |
| `typescript/cases/tts/tools/diff-report.mjs` | 比较两份 `--json`，断言只有 `--allow` 的 id 变化 |

### 7.2 候选协议（每个 form WP 必须实现）

```text
# class <Form>PossibleShape extends PossibleShape
## method ComputeByIndex:(units:Array<Token>, tokenIndex:int, cache:PossibleShapeCache)=>ShapeStates
    # 只做「这一格建不建」的判定：
    #   Accept    = 现在建（BuildByIndex 立即被调）
    #   Uncertain = 现在建不了但以后可能（**禁止**用 Reject 表达）
    #   Reject    = 本形态永远不会在这一格成立（谨慎；CatalogGuide 不会把它放回来）
    # 必须用 ItemUtil.ItemStartCached(units, cache) 取条目下界；
    # 跨条目状态只放 cache.GetShare/SetShare（自带新鲜度判据）。
## method IsBuildable:(units, tokenIndex, cache, context)=>bool
## method BuildByIndex:(host:Token, tokenIndex:int, catalog:CatalogGuide, context:SyntaxContext)=>Token
    # 只负责「造形状 + 挂进 host.Data + 设 Parent/MountedUnit」；
    # 归约（优先级/结合/封口）交给 ShapeOperatorStack，禁止自己再写一份优先级表。
## static method AppendTo:(shapes:Array<PossibleShape>)=>void
    # 片段注册入口（**只追加自己那一个候选**），由 ExpressionShapeCatalog 固定顺序调用。
```

- 形状类必须 `SignIn`/`SignOut` 自己的 `SourceRange`，`Pos` 按 C1 自己赋（`IdentifierShape` 不设 Pos，调用方赋）。
- 禁止：`ctx.Text` / `ctx.TextOf` / `ctx.StringText` / `ctx.source` / 字符串键查表 / `constructor.name`。
- 禁止：在候选里写「这条语句怎么收口」——收口由宿主（声明 `endPossible` / `StatementEndPossibleShape`）负责。

### 7.3 `ShapeOperatorStack` 契约

```text
# 构造：new ShapeOperatorStack(template:Template)
## method PushOperand:(shape:Token)=>void                 # 操作数入栈；未闭合操作数保持 open
## method PushOperator:(opShape:Token, text:string)=>void # 读 OperatorTable.Precedence / IsRightAssociative
## method Reduce:(precedence:int, rightAssoc:bool)=>Token|null
## method AttachRight:(shape:Token)=>void                # 右侧操作数挂到栈顶 Binary
## method Drain:()=>Token|null                           # 收口：归约到唯一根并返回
## method Root:()=>Token | null
```

**归约不变量**（实现者必须逐条自测）：

1. 每个 `BinaryExpressionShape` 出现时，左右操作数都已挂进 `Data` 且 `Parent` 正确；
2. 新运算符优先级**更紧**时：先 `Reduce` 到更低优先级，再在**右操作数位置**建新 `Binary`（`a+b*c`）；
3. 同优先级左结合：先归约（`a-b-c` 左结合）；右结合（`**`、赋值）不先归约；
4. 归约产出的 `Binary` 原位替换「左操作数 + 运算符」两格（既有惯用法，见 `binary-expression-possible-shape`）；
5. `Pos`：`Binary.Pos` = 左操作数 `Pos`；`src` = `[左操作数.srcStart, 右操作数.EndIndex)`；
   运算符形状 `Pos` = 左操作数 `EndIndex`（C1）；
6. `Drain` 后栈内不得残留未归约的运算符/操作数；残留 = 显式 throw（C10）。

### 7.4 `ExpressionShapeCatalog` 装配契约

```text
## static method CreatePrimary:()=>Array<PossibleShape>          # 原子（数字/标识符/字符串/模板/regex/…）
## static method CreateOperators:()=>Array<PossibleShape>        # 运算符候选（E-base 的 1 个 + form 扩展）
## static method CreateStatement:()=>Array<PossibleShape>        # 裸表达式语句（B2 用）
## static method CreateDeclarationInitializer:()=>Array<PossibleShape>  # 声明初始化器（E0b 用）
## static method AppendFragments:(shapes:Array<PossibleShape>)=>void    # 注册区（见 §5.1）
```

- 返回**新实例**（候选对象不缓存，C8；静态缓存会让同进程第二次解析拿到已 Reset 的状态）。
- `endPossible` 由宿主提供（声明层：`VariableDeclarationShape` 自己的终结候选；语句层：
  `StatementEndPossibleShape` + `StatementRoute.ShellPlainExpression`），目录里**不出现**终结候选。

### 7.5 错误文案与状态口径（统一，便于聚合）

```text
增量变量形状未支持：statement  <形态>    # 语句族未接线
增量变量形状未支持：list  <形态>         # 声明列表（, ; 等）
增量变量形状未支持：declaration  <形态>  # 绑定/修饰符/类型注解位置
增量变量形状未支持：expression  <形态>   # 表达式（运算符/操作数/成员）
增量变量形状未支持：type  <形态>         # 类型上下文
```

既有 38 组文案词表（`符号 <x>` / `运算符 <x>` / `括号` / `解构绑定` / `初始化器未读完` / `新运算符结合更紧` /
`左操作数不是形状` / `右操作数`）**逐字保留**，新增形态按同一格式扩展。

---

## 8. 风险与对策

| 风险 | 概率/影响 | 对策 |
| --- | --- | --- |
| **再结合**（`a+b*c` 类）把已闭合的 `Binary` 拆开重建，`Parent/MountedUnit/Data` 不一致 | 高 / 高 | E0a 先把 `ShapeOperatorStack` 用 `expr-probe.mjs` 独立验到 20+ 形态；A2 只许用它；所有拆分走 `splice` + 显式 `Parent` 重设，禁止直接改 `Data` 数组下标 |
| `CatalogGuide.Reject` 永久删除候选 → 永远等不到 Accept | 高 / 高 | 候选判据统一口径：能建=Accept，暂不能=Uncertain，永不支持=throw（**不用 Reject**，除非形态互斥且必不会回来）；E0a 在契约里写死 |
| 类名/层级与 legacy 不一致 → divergent | 中 / 高 | 先 `--show` 抄 EOF 树；`expr-probe.mjs` 逐字符 diff legacy；`diff-report.mjs` 拦跨 WP 回归 |
| `Pos` 差 1（前导 trivia / `{` 块内首语句） | 中 / 高 | C1 表 + 复用 `VariableStatementPossibleShape` 的块内 `pos` 算术（同一份代码搬用，不重写） |
| 性能退化（每字符 ~60 候选 × 415 case） | 中 / 中 | 目录按上下文分区（primary/operator/postfix 三份），`PossibleShapeCache` 槽位判状态；预算：`tts` 全量 < 3s（现 1.5s） |
| W2 五个 WP 同时改注册区 | 高 / 低 | §5.1 追加式注册区 + merge 时按 WP id 排序 |
| Phase B 的 192 条需要大量新壳，工作量大 | 高 / 中 | 按族拆 9 个 WP；B2 先做（49 条、接线量小、复用 E-base），用成功样板降低后续族成本 |
| ASI/`;`/`}` 的收口所有权（声明族 vs 语句族） | 中 / 高 | 收口只由宿主 `endPossible` 决定；E0a 契约禁止候选自己收口；B6 专门收口 |
| 显式 throw 与「账本已标注 throw」混淆 | 中 / 低 | throw 文案前缀固定；迁移前该 case 仍在 `throw/` 目录，迁移后才改标注 |
| 新开关误开污染默认路径 | 中 / 高 | 默认 false + 只有 `IsIncrementalShapesEnabled()` 读；E0a 交付时校验默认 false；TC 里跑 legacy 账本（`run.mjs` 的 legacy 半程） |

---

## 9. 未竟项与后续

1. **`feas-*` 的去留**：本方案判「不接线、标 deprecated」。若 Lead 希望最终删掉，需单独 WP（删除 5 文件 +
   删 `tests/feas-operator/`），**不在本方案范围**。
2. **W2 目标 case 的归属边界**（A1/A2/A4 之间有 3–5 条重叠，如 `let-init-object-literal`、`let-parenthesized-init`）：
   开工时用 `--show` 逐条确认，先认领者先做；归属冲突在 PR 描述里写明，A7 收口时以账本为准。
3. **B4b-i/ii 的 54 条类型形态切分**：本方案的切分是「按类型语法族」的初稿，实施时允许在 27/27 内微调，
   但不得改变「只写 own `types/forms/*` + 各 1 行注册」的约束。
4. **`tts/run.mjs` 的空集行为**：现实现对 0 case 会 `fail("没有找到 case")`（exit 2），B7 需改成 exit 0 + 提示；
   本方案不预改（不改源码）。
5. **`docs/token-time-shapes-incremental.md` / `docs/expected-token-time-shapes.md` 的同步**：B7 定稿时更新，
   列入 B7 的 own 文件。
6. **探针产物**：`tmp/agg-out.md`、`tmp/tts-report.json`、`tmp/case-ids.txt` 是本方案的证据，**gitignored 不提交**；
   复算见 §0 命令与 `tmp/agg.mjs`（脚本本身也在 tmp，若需长期保留由 E0a 挪进 `typescript/cases/tts/tools/`）。
