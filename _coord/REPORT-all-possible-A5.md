# REPORT-all-possible-A5 — 类型注解 / as·satisfies / 类型目录（Phase A 类型面）

- **任务**：`task-15`（WP-A5，依赖 E0b；依据 PLAN §3.4 / §4.1 A5 / §5.1 / §7）
- **分支**：`feat/a5`（base = `base-e0b` = E0b `feat/e0b` @ `f62730b0`，含 E0a `d03bfa82`；只提交本地分支，**未 push**）
- **克隆**：`C:\Users\Admin\Documents\GitHub\xl-example-set\a5-types`（`node_modules` 为指向 canonical 的 junction）
- **commit**：检查点 `5502cb76`（类型注解 + as/satisfies，22 条迁移）→ **最终 commit 见文末**（本报告与最终代码同一 commit）

## 1. 结论先行

| 项 | 基线（base-e0b） | 本 WP 完成后 |
| --- | --- | --- |
| 目标 case（31 条） | throw 20 + partial 11 | **26 条 `incremental` 并已迁 tts-impl**；剩 5 条见 §7 |
| `tts` 账本 | PASS 380 / FAIL 0 | **PASS 354 / FAIL 0**（380 − 26 迁出） |
| `tts-impl` | PASS 45 / FAIL 0 | **PASS 71 / FAIL 0**（45 + 26） |
| 非目标分类漂移 | — | **0**（380 条逐 id 比对 baseline `--json`） |
| `xl_build`（core+typescript→ts） | 569 written / 0 error / 3 warning | **0 error / 3 warning**（同一批既有 E1107） |
| `tsc -p .` | exit 0 | **exit 0** |
| 开关 false（legacy） | — | 26 条目标 case 的 **legacy EOF 树逐字节不变**（§5） |
| 确定性 | — | 两次独立进程 `--json` 逐字节相同（tts / tts-impl） |

## 2. 目标 case 前后分类（`--show` 实测）

**26 条达成（throw/partial → incremental，已迁 `tts-impl/cases/<area>/`）**

| area | case |
| --- | --- |
| declarations（2） | `let-type-annotation`、`let-type-annotation-init` |
| lexical（1） | `let-type-annotation` |
| expressions（2） | `as-expr`、`satisfies-expr` |
| types（21） | `as-array-type`、`as-intersection-type`、`as-qualified-type`、`as-union-type`、`const-annotation-init`、`let-annotation-no-init`、`paren-as-init`、`satisfies-object-type`、`var-readonly-array-annotation`、`as-chain-type`、`as-const-assertion`、`as-keyof-typeof`、`as-literal-string-type`、`as-primitive-type`、`as-template-literal-type`、`satisfies-then-as`、`satisfies-type`、`arrow-typed-param`、`arrow-async-typed-param`、`function-expression-typed-param`、`generic-call-type-args` |

**5 条未达成（仍留原目录 / 原标注，见 §7）**：`angle-assertion`、`generic-arrow-typed-param`、`nonnull-assertion`、`destructure-array-annotation`、`destructure-object-annotation`。

## 3. 实现（2 个文件 + 26 条迁移）

### 3.1 新增 `typescript/tokens/types/type-catalog-factory.xl.md`（本 WP own）

`class TypeCatalogFactory` —— 类型上下文的**唯一装配点**。本 WP 的落地路线是「**复用 legacy 建造器 + 提前落地**」：

| 方法 | 作用 |
| --- | --- |
| `ParseType(units, basePos, template, context)` | 用 legacy `TypeBuilder` 解析一段类型单元；不完整返回 `null`。`basePos` 与 legacy 的 `Positions[typeFirst]` 同口径（`:` / `as` 的 `EndIndex`），因此类型节点的**类名、层级、`Pos` 与 legacy 逐节点同源**（不需要为每种类型形态重写 Pos 算术）。 |
| `ParseInitializer(units, basePos, template, context)` | 用 legacy `ExpressionBuilder` 解析初始化器 raw 单元（与 `FinishIncremental` 的降级分支**同一个建造器、同一个 basePos**）。 |
| `AnnotationColon` / `FirstEqual` | 在 `VariableDeclarationShape.Data` 里定位「`=` 之前的顶层 `:`」与第一个 `=`（三元 `? :` / 对象字面量的 `:` 都在 `=` 之后，不会被误判成注解）。 |
| `CanEndType` / `CanEndInitializer` | 提前落地的**时机判据**：类型后面不能是 `.[<|&?>` 等延拓字符、初始化器后面必须是语句/声明分隔或输入结束。只有判「不能继续长」时才落地。 |
| `HasTypeAssert` / `HasParameterType` / `HasTypeArgumentCall` / `StartsTypedInitializer` | 本 WP 接管的形态判定：`y as T` / `y satisfies T` / `(y as T)`；参数带 `:` 注解的函数·箭头表达式（`(a: number) => a` / `async (…) =>` / `function (…){}` / `<T>(a: T) => a`）；泛型调用 `f<string>()`。 |
| `AppendFragments` + `Annotations` | `// [T-CAT:REGISTER]` 注册区（候选式类型片段给 B4b-i/ii 追加；本 WP 走 `ParseType` 路线，注册区为空）。 |

> **与 PLAN 字面写法的偏差（重要）**：PLAN 期望「`types/forms/<形态>-shape-possible.xl.md` + 注册区一行」的**候选式**类型目录。实读后确认：类型节点全部已有 legacy 形状类与 `TypeBuilder` 工厂，候选式重写等于把 `TypeBuilder` 的 Pos 算术抄一遍（§7 的 Pos 表格逐形态不同）。因此本 WP 选择「`ParseType` 复用 legacy 建造器 + `CanEndType` 判提前落地」，`forms/` 与注册区保留给 B4b（与候选式目录可并存：候选先建子形状，`ParseType` 在 EOF 兜底，符合 C6）。

### 3.2 修改 `typescript/tokens/declarations/variable-declaration-shape.xl.md`（E0b 交付后归本 WP，A6 不碰）

- 新增字段 `TypeMode` / `AnnotationDone` / `InitializerDone`。
- **`ComputePossibleShapes` override**（本 WP 的接线点，单点）：只对**根层**声明（挂载链 `host←statement←list←declaration`，`host.Parent === null`）且形态命中本 WP 时接管：
  - 进入后**不再转给表达式候选目录**（避免目录在 `:` / `as` / 类型单元上误建或 `Reject`）；
  - 调 `AdvanceTypeMode` → `TryBuildAnnotation` → `TryBuildTypedInitializer`，用 `ParseType` / `ParseInitializer` 逐单元尝试，成功且 `CanEndType` / `CanEndInitializer` 判「不能继续长」时**当场落地形状**（替换 raw 单元）。
- **`FinishIncremental` 调整**：(a) 标识符之后允许**一个**注解类型节点（`[IdentifierShape, TypeNode, (=) …]`，与 legacy `Data` 同形）；(b) 忽略语句分号 `;`（legacy 的 `VariableDeclarationShape.Data` 里没有 `;`）；(c) 初始化器 raw 过滤 `;` 后再走既有「唯一表达式根 / ExpressionBuilder 降级」分支（语义与 E0b 的契约一致，未放宽「多根」拒绝）。
- **块体内声明不接管**（只在根层生效）：实测块体里（`try { let y: number = 1 } catch { }`）提前落地会与块体/控制流壳的收口时机耦合，产生 divergent；显式不接管后该 case 回到原来的 throw 账本（零漂移），续任若要支持块体注解，应沿块体自己的 `BlockPossibleShape` 收口路径做。

### 3.3 迁移

26 条只用 `git mv`（内容逐字节不变）：`throw/types` / `partial/types` 18 条 → `tts-impl/cases/types/`；`partial/expressions` 2 条 → `expressions/`；`throw/declarations` 2 条 → `declarations/`；`throw/lexical` 1 条 → `lexical/`；`throw/types` 里另有 4 条 typed-param / 泛型调用同上去 `types/`（合计 21 + 2 + 2 + 1 = 26）。

## 4. 开关门控（legacy 逐字节不变的机制）

1. **门控点只有一处**：`VariableDeclarationShape.ComputePossibleShapes` 的 `if (this.Incremental && !this.Closed)` —— `this.Incremental` 只由 `IncrementalVariableStatementBuilder.Build` 置 true，而它只在 `StatementRouteUtil.IsIncrementalVariableShapesEnabled()` 为真时被 `VariableStatementPossibleShape.BuildByIndex` 调用（E0b 已确认的机械链）。
2. 开关 false ⇒ `Incremental` 恒 false ⇒ `ComputePossibleShapes` override 逐字走 `super`、`FinishIncremental` 一次都不执行、`TypeCatalogFactory.ParseType/ParseInitializer` 一次都不被调用 ⇒ **新路径一步不走**。
3. 本 WP **没有读任何开关**、没有新增开关读取；`statement-route-util` / `expression-catalog-factory` / `expression-shape-catalog` / `statement-shape` / `root-expression-statement-possible-shape` / `operator-shape-map` / `import/export 相关文件` **一行未改**（`as`/`satisfies` 也没有另写优先级：本 WP 用的是 legacy `ExpressionBuilder` 的类型断言分支，与 `OperatorShapeMap.PositionTypeAssert` 同源，见 §7 的偏差说明）。

## 5. 证据

### 5.1 EOF 树一致性（identity=(类名,pos)）

- 探针：`tmp/probe.mjs`（gitignored）：同一进程跑 legacy / incremental 两遍（逐字符 + EOF），输出「EOF shape 行（剥 `src`）是否一致」与每个非 basic 节点的**首次出现步号**。
- 26 条达成 case：`EOF shape 行一致: true` ×26；`divergent 文件数: 0`；所有节点首次出现步号均为 `EARLIER`（例：`let x: number` 的 `NumberKeywordShape@pos=6` legacy=14 → incremental=13、三层骨架 legacy=14 → incremental=5；`let x = y as number` 的 `AsExpressionShape@pos=7` legacy=20 → incremental=19）。
- 一致性来源是构造性的：类型节点由 **legacy `TypeBuilder`** 建、初始化器由 **legacy `ExpressionBuilder`**（`FinishIncremental` 原有的降级分支同一个建造器、同一个 `basePos`）建，形状类名/层级/`Pos` 与 legacy 逐节点同源。

### 5.2 开关 false 逐字节不变

- 方法：改动前跑一次探针（`tmp/probe-baseline.txt`，31 条目标的源码 + 双模式树），改动后对迁入 tts-impl 的 26 条再跑一次（`tmp/probe-final*.txt`），用 `tmp/legacy-diff.mjs` 按**case 源码**对齐、抽出 **legacy EOF 树全文（含 basic 行与 `src`，不剥）** 逐字节比较。
- 读数：`ALL LEGACY EOF TREES BYTE-IDENTICAL`（26/26，exit 0；分两批：22 条 + 4 条各一次）。
- 补充：全量 380 条 baseline `--json` 与完成 `--json` 逐 id 比对 → `base 380 / cur 354 / drift 0`。

### 5.3 验收命令读数（最终）

```text
xl_build { cwd:<克隆>, paths:["core","typescript"], targets:["ts"] }  → 0 error / 3 warning（同一批既有 E1107）
node node_modules/typescript/bin/tsc -p .                             → exit 0
node typescript/cases/tts/run.mjs                                      → [tts] PASS 354 / FAIL 0 / 354（exit 0）
node typescript/cases/tts-impl/run.mjs                                 → [tts-impl] PASS 71 / FAIL 0 / 71（exit 0）
两次独立进程 --json：tts / tts-impl 各自逐字节相同
```

## 6. 给 B4b / A6 / A7 的说明

1. **B4b-i/ii（类型形态）**：类型目录的「候选式扩展」入口是 `TypeCatalogFactory.Annotations`（`// [T-CAT:REGISTER]`，`AppendFragments`）。当前为空：本 WP 的形态全部由 `ParseType` 兜住。若 B4b 要为某个类型形态**提前**建子形状（而不等到类型完整），在注册区追加候选即可；`ParseType` 仍是 EOF 兜底（C6）。`TypeBuilder` 的 `ParseType` / `ParseTypeArguments` / `ParseTypeParameterList` / `ParseImportType` / `ParseMappedType` / `ParseTemplateType` 可直接复用（Pos 口径见各 `Positions` 用法）。
2. **A6（`,` / `;` / `!` / 解构）**：`FinishIncremental` 现在**忽略语句分号 `;`**（注解 case `let x: number;` 需要）。`;` 的语义收口仍在语句层（`VariableStatementShape`）；A6 做「无初始化器的 `;` 形态」时不要把它当初始化器单元。多声明 `,`、确定赋值 `!`、解构绑定的 throw 保持原样（本 WP 未放宽）。
3. **A7**：本 WP 迁移 26 条（`tts` 380 → 354，`tts-impl` 45 → 71），`INDEX.md` 与两个 README 的「现状」表**未改**（按 §5.1 归 A7/B7 重跑 `--write-index`）。
4. **续任（剩余 5 条）**见 §7。

## 7. 未竟项（剩余 5 条）与交接点

| case | 现状 | 为什么本 WP 不做 / 怎么做 |
| --- | --- | --- |
| `angle-assertion`（`<T>y`） | throw（`expression 运算符 <`） | 同形 case `throw/expressions/angle-assert.ts`（`<number>y`）是 **A4 的账本 case**：一旦支持尖括号断言，它们会一起变 incremental（非目标漂移）。交接：A4 做尖括号断言时把两条一起迁（`TypeBuilder` 的尖括号/断言路径 + `OperatorShapeMap.PositionPrefix` 之外的 `KindTypeAssert` 语义）。 |
| `generic-arrow-typed-param`（`<T>(a: T) => a`） | throw（`expression 运算符 <`） | 同上：`<` 起首的歧义（尖括号断言 vs 泛型箭头）要等 A4 的尖括号支持再区分。`(a: T) => a` 本体已由 `HasParameterType` 支持，只差 `<` 的判别。 |
| `nonnull-assertion`（`y!`） | throw（`declaration 符号 !`） | 同形 case `throw/expressions/ref-nonnull.ts`（`let x = a!`）是 **A3 的账本 case**：支持 `!` 会一起变 incremental。交接：A3 做非空断言时一起迁。 |
| `destructure-array-annotation`（`let [a]: T = xs`） | throw（`declaration 解构绑定`） | 卡在**上游建造器**：`IncrementalVariableStatementBuilder.Build` 只接受单标识符绑定，解构在挂壳前就 throw；本 WP 的写域碰不到它。交接：A6 做解构绑定时，把「绑定形状 + 注解类型节点」的挂载点一起做（`let [a]` 的 `Data` 是 `[ArrayBindingPatternShape, TypeNode, expr]`，`FinishIncremental` 的「标识符」假设要放宽成「绑定形状」）。 |
| `destructure-object-annotation`（`let { a }: T = obj`） | throw（同上） | 同上（`ObjectBindingPatternShape`）。 |

## 8. 风险

| 风险 | 影响 | 处置 |
| --- | --- | --- |
| 「提前落地」是**按单元重解析**（每个新单元尝试一次 `ExpressionBuilder` / `TypeBuilder`），不是候选式逐步长形状 | 性能：类型/断言初始化器每个单元一次解析（都是短片段） | 落地后 `InitializerDone` / `AnnotationDone` 置位，之后不再解析；`tts` 全量耗时无可见退化 |
| 根层限定（块体不接管） | 块体内的注解仍 throw（如 `try { let y: number = 1 }`） | 明确写在 §3.2；块体 case 归 A6/B1 的收口路径 |
| `TypeCatalogFactory` 的形态判定（`HasTypeAssert` / `HasParameterType` / `HasTypeArgumentCall`）与 A3/A4 的形态边界 | 误接管会改变别人的账本分类 | 判据刻意「窄」：只认带类型注解/断言/类型实参的形态（同族无类型形态不接管）；每次扩展都跑全量 `tts` 比对漂移（本次 380 条 drift 0） |
| `FinishIncremental` 放宽「标识符后允许一个类型节点 + 忽略 `;`」 | 若将来有形态在标识符后多出一个非 basic 节点，会被当成注解类型节点收下 | 只允许**一个**（第二个非 basic 且未到 `=` 仍走原 throw `declaration 声明体`）；E0b 的「初始化器多根」拒绝未放宽 |
| 两处 `INDEX.md` / README「现状」表陈旧 | 文档口径 | A7/B7 重跑 `--write-index` |

## 9. 提交与读数（最终）

- 分支 `feat/a5`；工作区干净（`tmp/` 全 gitignored，未提交）。
- 检查点 `5502cb76`；最终 commit = 本文件所在 commit（`git log --oneline -2`）。
- 最终读数：`xl_build` 0 error / 569 个产物 / `tsc` exit 0 / `tts` PASS 354 FAIL 0 / `tts-impl` PASS 71 FAIL 0 / `--json` 两次一致 / 26 条 legacy EOF 树逐字节一致 / 非目标漂移 0。
