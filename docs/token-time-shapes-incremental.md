# 增量 shape 构建（token-time-shapes）一页纸

本文是 `docs/expected-token-time-shapes.md` 的**实现说明**，不是第二份口径：
唯一的验收口径仍是那份文档的逐字符 shape 树（**14 步 = 13 char + EOF**，样本 `let x = 2*3+1` 是 13 个字符）。
本文回答四件事：开关怎么开、每个字符由谁建什么、覆盖到哪里为止、怎么验证。

## 1. 开关

唯一静态开关（`typescript/tokens/statements/statement-route-util.xl.md`）：

```ts
StatementRouteUtil.EnableIncrementalVariableShapes: bool = true    // 默认 true
StatementRouteUtil.IsIncrementalVariableShapesEnabled(): bool      // 读开关的唯一入口
```

- **默认 `true`**（D7 波起，增量形状是产品默认）：旧的「`StatementShape` 空壳 → EOF 时 `StatementBuilder` 原子建树」
  只剩 `--legacy` 复核档。当前读数（语料 1945，`dist/ts` 已剔除）：崩溃 **0**、差异 **33**、fallback **85 + 白名单外部 13 = 98**；`--legacy` **0 / 0 / ≤2**。天花板与清单都在 `tests/parse/incremental-crash-expected.mjs`（预期崩溃清单**已清空**）。
- 只在目标用例工具里打开（`tests/parse/token-time-shapes.mjs`）：

```powershell
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --mode incremental   # 等价
npm run tts:incremental                                                                                   # 等价
```

- 开关字段名可用环境变量 `TTS_MODE_FIELD` 覆盖；字段不存在时工具在 stderr 提示一行并**按 legacy 继续**（不算错误）。
- 同一进程内两种模式可交替：工具每次解析前显式写一次字段。

## 2. 逐字符时序（开关 ON，实测）

| 步 | 触发时机 | 谁建什么 | 要点 |
| --- | --- | --- | --- |
| char 0–4 `let x` | `Common("x")` 关闭 | `VariableStatementPossibleShape` 分流 → `VariableStatementShape`(pos=0) → `VariableDeclarationListShape`(pos=0) → `VariableDeclarationShape`(pos=3,[4,...))，`Common("x")` 原位换成 `IdentifierShape`(pos=3,[4,5)) | 三层按 C1 签入；`let` 与前导 trivia 被语句吸收；挂载链 `host → statement → list → declaration`，之后字符直接落进最内层 |
| char 5 `" "` | 空白 trivia | `WrapSymbol[5,6)` 进 declaration 的 `Data` | 中间态保留 trivia（C2），`Close` 时才丢弃 |
| char 6 `=` | `Symbol("=")` 关闭 | declaration 目录被问一次 | 表达式候选此时必须回 **`Uncertain`**（不是 `Reject`），见第 6 节 |
| char 7 `" "` | 空白 trivia | `WrapSymbol[7,8)` | 同上，`Uncertain` |
| char 8 `2` | `Common("2")` 关闭 | `NumericLiteralPossibleShape` → `NumericLiteralShape(pos=7,[8,9))` | `Replace` 原位换；`CloseStates.Built` → `Reload` 重放 |
| char 9 `*` | `Symbol("*")` 关闭 | `BinaryExpressionPossibleShape` → `AsteriskTokenShape(pos=9,[9,10))` + `BinaryExpressionShape(pos=7,[8,...))` | Binary 顶替左操作数那一格，`host.MountedUnit = binary` |
| char 10 `3` | `Common("3")` 关闭 | `RightOperandPossibleShape` → `NumericLiteralShape(pos=10,[10,11))`，同一判定内 `SealRightOperand` | `TryToClose` 用右操作数终点封 `[8,11)` → `Quit()` 卸载 → 重放后 `+` 落回 declaration |
| char 11 `+` | `Symbol("+")` 关闭 | `BinaryExpressionPossibleShape` → `PlusTokenShape(pos=11,[11,12))` + `BinaryExpressionShape(+)` | 已封口的 `Binary(*)` 作左操作数 |
| char 12 `1` | `Common("1")` 关闭 | 进 `Binary(+)` 的 `Data`（仍是 basic 单元） | — |
| EOF | 声明收口 `FinishIncremental` | 收下前先 `builtShape.TryToClose(context)` → 触发尾单元 `Close` → `RightOperandPossibleShape` → `NumericLiteralShape(pos=12,[12,13))` + 封 `Binary(+)` `[8,13)` | EOF 没有下一个字符，尾单元只能在这里关（第 6 节第 2 条） |

两条通用规则：`Pos` = 前一个非 trivia 单元的 `SourceRange.EndIndex`（`IncrementalItemPosition.AfterPreviousCode`）；
运算符资格与优先级只**只读查询** `OperatorTable`，不复制运算符表、不在表里加状态。

## 3. 覆盖边界（历史边界，收尾前）

### 3.1 2026-10 收尾状态

> **本节 3.2 起是「收尾前」的历史边界，作为设计演进记录保留，不再是当前能力边界。**
>
> 收尾时原 56 条缺口（throw 40 / atomic 11 / partial 5）**已全部实现增量支持**，并各作为一条 case
> 迁入 `tts-impl` 账本；收尾后的读数：`tts` 账本 **0 条**、`tts-impl` **425 条**，空账本运行 **exit 0**
> （`npm run tts:cases` / `npm run tts:impl` 两条 runner）。因此下文「不支持：… 一律按 C10 显式抛错」
> 只描述收尾**前**的边界；这些形态现在各有 case 固化，判断能力边界请看 `tts-impl` 账本，不要看本节。
>
> 2026-10 之后新增 7 条「复合 case」；其中 4 条仍是 `throw`（`tts/cases/throw/composite/`），
> 两条合法 TS 但触发旧判据 `divergent`/`invalid` 的复现文件放在 `tts/_notes/composite-probes/`。
>
> 随后为用新判据（[`tshape-judge`](../typescript/cases/tts/tools/tshape-judge.md)：完整解析 vs
> `ts.createSourceFile` + 逐字 AST line 按范本诊断）重新复核，`tts-impl` 的 425 条已全部迁回 `tts`。
> 2026-10 修复（S1 `switch/case` 子句头 + 函数体目录、S2 `;` 收口 / `TypeMode`、S3 namespace 体声明 +
> `?:` 拆分、S4b 未完成标识符操作数、S5 复合三目兜底、S6 switch 子句头模式门控、R1 `src` 末尾 trivia）
> 合入后，当前读数是 `ts` **429 条**（`throw` **3** / `incremental` **426**，`control-flow` 已由 S1 从
> `throw/composite` 迁到 `incremental/composite`、内容逐字节不变），`tts-impl` **0 条**（空账本）；
> `incremental` 只是旧 runner 的 legacy 对拍标签，**不是新判据的结论**。`tshape-judge ts-all` 为
> **426 ok / 0 moved / 3 incremental-error / 0 structural / 0 fields**。剩余缺口：P1「成批补建」
> （class/function/interface/type alias 的壳 + 收口补子树）、三目仍走收口原子建树、字符串右操作数未支持，
> 以及 3 条 `incremental-error` composite（`class-ball` / `expression-zoo` / `generic-container`）。
> 详见 [`tts/README.md`](../typescript/cases/tts/README.md)「仍开放的缺口」。
>
> 仍成立的一条是本节末条：开关默认 `false`，默认解析路径仍是「`StatementShape` 空壳 → EOF 时
> `StatementBuilder` 原子建树」，与重构前逐字节相同；增量建树是被开关选中的路径（`npm run tts:incremental`
> 与 harness 都显式打开），不是默认路径。

### 3.2 历史边界（2026-10 收尾前）

- 支持：`let` / `const` / `var` + **单个 `Common` 标识符**绑定 + 初始化器为**数字字面量**或
  `*` / `+` 构成的二元表达式（收尾前的运算符集合以 `ExpressionCatalogFactory` / `BuildOperator` 的白名单为准）。
- 不支持：类型注解 `:`、多声明 `,`、`!`、解构、`;`、其它运算符、其它表达式形态 —— 一律按契约 **C10 显式抛错**
  （`增量变量形状未支持：<stage> <形态>`），**不会**静默产出错误的树。
- 开关仍为 `false` 时上述代码路径一步都不走；`StatementBuilder` / `BuildFromShell` / `FinishShell` /
  `ExpressionBuilder` 全部保留为 fallback（EOF 收口时的降级路径也在用）。

## 4. 与目标文档的关系

- `docs/expected-token-time-shapes.md` 的 14 步在增量模式下**逐字节一致**，唯一例外是 char 11 期望块里的
  行尾注释 `← 3 关闭即封口`：工具只对**期望侧**尾部 `/\s+←.*$/` 容错，该行去注解后相等即该步 PASS 并标
  `[annotation-only]`；文档与稳定期望文件都不改。
- 增量模式不是「另一份期望」，它跑的是同一份 `let-x.expected.txt`；`--from-doc` 可直接与文档比对，用于发现文档漂移。

## 5. 如何验证

```powershell
# 构建（本机无 xl CLI）：xl_build 工具 cwd=<repo>、paths=["core","typescript"]、targets=["ts"]、不要传 out
node node_modules/typescript/bin/tsc -p .

# 目标用例
npm run tts                              # legacy：PASS 6 / FAIL 8 / 14，exit 1（既有基线，不是回归）
npm run tts:incremental                  # 增量：PASS 14 / FAIL 0 / 14，exit 0（char 11 标 [annotation-only]）
npm run tts:corpus                       # legacy 语料：1723 文件 / 差异 0，exit 0

# 附加：直接与官方文档比对（检测文档漂移）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --from-doc
```

## 6. 实现时必须记住的三件事

1. **`CatalogGuide` 只在建出形状后才 `Reset()`**，被 `Reject` 掉的候选不会再回来。所以声明层目录在 char 6（`=`）
   与 char 7（空白）被问到时，表达式候选必须回 `Uncertain`；一旦回 `Reject`，到 char 8 候选目录已空，
   永远不建，读数会停在 10/4。
2. **EOF 的尾单元必须显式关一次**：`FinishIncremental` 在收下已建表达式前补 `builtShape.TryToClose(context)`。
   尾单元的 `Close` 是「问父单元目录 → 右操作数候选 → 换成 `NumericLiteralShape` + 封口」的唯一触发点，
   而 EOF 没有下一个字符来触发它。这 2 行落在 WP-B 的文件里（跨包补丁，见 `_coord/CONTRACT-tts-incremental.md`
   的「最终实现与实测坑」）。
3. **右操作数候选只有一份定义**：`RightOperandPossibleShape.Catalog()`；`ExpressionCatalogFactory.CreateRightOperandCatalog()`
   只是转调它，避免声明层与二元层各写一套判据而漂移。

## 7. 后续路线（历史：收尾前计划，已全部实现）

> 下面这条路线在 2026-10 收尾时**已全部走完**：类型注解、多声明、解构、其它运算符、更多表达式形态
> 都已在增量路径上实现，并各有 `tts-impl` case。保留原文是因为它的**验收链写法**仍然有效：
> 每扩一步都用同一条链验证（legacy 14 步基线、`tts:incremental` 14/14、`tts:corpus` 0 差异，
> 外加当时的缺口 case 台账 `tts` → 现在 `tts-impl`）。

类型注解（`:` + 类型目录）→ 多声明（`,` 与列表重启）→ 解构（对象/数组 binding）→ 其它运算符（`BuildOperator`
扩一个 `if` 分支 + 目录加候选）→ 更多表达式形态（调用、成员访问、括号）。每扩一步都用同一条验收链：
`npm run tts` 保持 6/8/14、`npm run tts:incremental` 保持 14/14、`npm run tts:corpus` 保持 0 差异。
