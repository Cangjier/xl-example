# REPORT-tts-wp-b — 变量声明三层增量（char 5–8）

- 分支：`tts-wp-b`（从 `origin/refactor/token-time-shapes` @ `5ced7ace` 起，先 `--no-ff` 并入 WP-A `d35736b5`）
- 开关：`StatementRouteUtil.EnableIncrementalVariableShapes`（默认 `false`；只在目标工具 `--incremental` 时打开）
- 契约：`_coord/CONTRACT-tts-incremental.md` C1–C11

## 1. 改动文件

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/variable-statement-possible-shape.xl.md` | `BuildByIndex` 开头加增量分流（开关 ON 时整条建造交给 `IncrementalVariableStatementBuilder.Build`），旧壳路径一字未动 |
| `typescript/tokens/declarations/variable-declaration-possible-shape.xl.md` | **新增** `IncrementalVariableStatementBuilder`：一次 `BuildByIndex` 建三层、按归属搬已有 basic 单元、挂载链、挂 `CatalogGuide` |
| `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md` | **新增** `VariableDeclarationEndPossibleShape`（VD 的终结候选，C8；C10 未支持形态显式抛错） |
| `typescript/tokens/declarations/variable-declaration-shape.xl.md` | 新增 `Incremental` 字段、`TryToClose` 覆写、`FinishIncremental`（C2 字段提取 + EOF fallback 表达式建树） |
| `typescript/tokens/statements/variable-statement-shape.xl.md` | 新增 `Incremental` 字段 + `TryToClose` 覆写（EOF 时由内向外收口三层） |

## 2. 三层签入口径（C1 落地，实测与期望逐字节一致）

| shape | Pos | SourceRange |
| --- | --- | --- |
| `VariableStatementShape` | 语句首（根层 `0`） | 从 `0` 起，`SignIn(pos)` |
| `VariableDeclarationListShape` | 同语句 | 从 `0` 起 |
| `VariableDeclarationShape` | 声明关键字 `let` 的 `EndIndex`（=3） | 从首个绑定起点 `4` 起（跳过前导 trivia） |
| `IdentifierShape` | 3（工厂不设，调用方补） | `[4,5)`（`FromBasicToken` 从 token 取） |

`let` 与前导 `WrapSymbol[3,4)` 被 statement 吸收（不进任何 `Data`）；词法标识符 `Common("x")` 用
`IdentifierShape.FromBasicToken(...)` 原位替换（不是 Replace：它被搬进 declaration 的 `Data` 后即取代原位置）。
`host.MountedUnit = statement` → `statement.MountedUnit = list` → `list.MountedUnit = declaration`，之后字符由最内层
declaration 直接吃，char 6/7/8 的 `=` / 空格 / `2` 自然落进它的 `Data`（无 `Process` / `ExitOrPre` 覆写）。

## 3. EOF 收口与 fallback

- EOF 由 `SourceFileShape.Process(buffer.IsEof())` 触发：先 `mounted.TryToClose`。`VariableStatementShape.TryToClose`
  在增量模式里按挂载链由内向外关：`VariableDeclarationShape` → `VariableDeclarationListShape` → 自己 → 基类。
- `VariableDeclarationShape.FinishIncremental` 先提取字段（标识符 / 可选 `=` / 初始化器），再丢弃 trivia / `=` /
  未消费 basic token（C2）。初始化器仍是 raw basic 单元时，**降级**用现有 `ExpressionBuilder`
  （`Load(raw, basePos)` + `ParseExpression()`，`basePos` = `=` 的 `EndIndex` = 7）原子建表达式；建出的
  `BinaryExpressionShape` 直接放进 `Data`，所以 EOF 树与 legacy 逐字节相同。
- WP-C 合入后：初始值里出现非 basic 的 shape 时自动走「已建好的形状直接收下」分支，fallback 保留（C6）。
- 未支持形态（`:` 类型注解、`,` 多声明、`!`、解构、`;` 等）在 `FinishIncremental` / 终结候选里显式抛
  `增量变量形状未支持：<stage> <形态>`（C10）；默认 `false` 时这段代码一次都不经过。

## 4. 验收读数（本克隆，`xl_build` + `tsc -p .` 后）

| 项 | 读数 |
| --- | --- |
| `xl_build` core+typescript targets=ts | **563 written / 0 error / 3 warning**（3 个既有 E1107） |
| `tsc -p .` | exit 0 |
| legacy 目标用例 `--diff` | **PASS 6 / FAIL 8 / 14**（char 0–4、EOF PASS；与 `5ced7ace` 一致） |
| incremental `--diff --incremental` | **PASS 10 / FAIL 4 / 14**（char 0–8、EOF PASS；char 9–12 FAIL，属 WP-C） |
| legacy 语料 `--legacy-corpus` | 1723 文件 / **差异 0**（变化 0 / 缺失 0 / 新增 0） |

incremental 逐步骤：0 PASS、1 PASS、2 PASS、3 PASS、4 PASS、5 PASS、6 PASS、7 PASS、8 PASS、9 FAIL、10 FAIL、
11 FAIL、12 FAIL、EOF PASS。char 9–12 的失败是**结构差**（还是 raw `Common`，WP-C 负责 `NumericLiteralShape` /
`AsteriskTokenShape` / `BinaryExpressionShape`），**没有异常 / ERROR**。

## 5. 给 WP-C 的接口与后续

- `VariableDeclarationShape.CatalogGuide = new CatalogGuide(ExpressionCatalogFactory.Create(), new VariableDeclarationEndPossibleShape())`
  已挂好：往 `ExpressionCatalogFactory.Create()` 里填候选即可接管 char 8+ 的表达式增量（每次返回新实例，C8）。
- `IncrementalVariableStatementBuilder` 只处理「root + `let`/`const`/`var` + 单个 `Common` 标识符绑定」；绑定之后
  本次 build 里还有代码单元会抛 C10。
- 终结候选 `VariableDeclarationEndPossibleShape` 现在对目标路径中间态（`=` / 二元运算符 / `Common` / 已建 shape）
  一律 `Reject`（等待），其它符号抛 C10。WP-C 若要让 `*` / `+` 之外的操作符进入增量路径，改这个白名单即可
  （文件归属 WP-B，需先发消息）。
- EOF 收口不走终结候选：`VariableStatementShape.TryToClose` 直接按挂载链收口；WP-C 把 `Data` 里换成表达式 shape
  后无需改收口代码，`FinishIncremental` 的「已建 shape 直接收下」分支会保留它。

## 6. HANDOFF

无。WP-B 范围内全部验收通过；char 9–12 按分工留给 WP-C。未 push（按要求）。
