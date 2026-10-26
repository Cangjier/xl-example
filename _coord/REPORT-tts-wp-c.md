# REPORT-tts-wp-c — 表达式增量 + 二元运算与封口（char 9–12，WP-C）

- **角色**：重构团队 WP-C（共享任务板 `task-6`，已 claim）。
- **分支**：`tts-wp-c`（本克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-c`），
  从 canonical 只读暂存分支 `origin/refactor/token-time-shapes` @ `5ced7ace` 切出，先并入 WP-A（`d35736b5`）。
- **完整验收已并入 WP-B**：`tts-wp-b` @ `18d66eaf`（merge commit `chore(tts): 引入 WP-B 三层`，无冲突）。
- **状态**：**完成。incremental 14/14 PASS**（char 11 `[annotation-only]` 计 PASS），legacy 6/8/14、语料 1723 / 0 差异、
  tsc exit 0、工作区干净。EOF 一步依赖一处**跨包最小补丁**（Lead 已授权，见 §7）。

> **跨包最小补丁（所有权记录）**：WP-B 文件 `typescript/tokens/declarations/variable-declaration-shape.xl.md` 的
> `FinishIncremental` 在**收下已建 shape 之前补一次 `TryToClose(context)`**（2 行 + 注释）。
> 原因：EOF 没有下一个字符来触发尾单元关闭，而尾单元的 `Close` 才是「问父单元目录 → 右操作数候选 →
> `Replace` 成 NumericLiteral + 封口」的唯一触发点。除这 2 行外未动 WP-B 任何逻辑。

---

## 1. 设计：谁在何时建什么、封口次序

### 1.1 目录分工（`ExpressionCatalogFactory` 是唯一装配点）

| 宿主 | 目录来源 | 候选 |
| --- | --- | --- |
| `VariableDeclarationShape`（WP-B 挂） | `ExpressionCatalogFactory.Create()` | `NumericLiteralPossibleShape`（char 8）、`BinaryExpressionPossibleShape`（char 9–12） |
| `BinaryExpressionShape`（本包建形状时挂） | `ExpressionCatalogFactory.CreateRightOperandCatalog()` → `RightOperandPossibleShape.Catalog()` | `RightOperandPossibleShape`（char 10–11、EOF 的右操作数） |

- 声明层与二元层用**两个不同候选类**：判据/建形状语句相同，区别只有「建完要不要替宿主封口」。
- 两个 `Create*` 都**每次返回新实例**（候选对象不缓存）；`CreateRightOperandCatalog` 转调
  `RightOperandPossibleShape.Catalog()`，右操作数候选只有一份定义。

### 1.2 逐字符时序（实测）

| 步 | 触发 | 谁建什么 | 关键动作 |
| --- | --- | --- | --- |
| char 9 `*` | `Common("2")` 关闭 → 声明目录 | `NumericLiteralPossibleShape` → `NumericLiteralShape(pos=7,[8,9))` | `Replace` 原位换；`CloseStates.Built` → `Reload` 重放 `*` → `Symbol("*")` 落回声明层 |
| char 10 `3` | `Symbol("*")` 关闭 → 声明目录 | `BinaryExpressionPossibleShape` → `AsteriskTokenShape(pos=9,[9,10))` + `BinaryExpressionShape(pos=7,[8,未封))` | 运算符先 `Replace`；左操作数 + 运算符移入 Binary；Binary **顶替左操作数那一格**并 `host.MountedUnit = binary` → 重放后 `Common("3")` 进 `Binary.Data` |
| char 11 `+` | `Common("3")` 关闭 → **Binary 目录** | `RightOperandPossibleShape` → `NumericLiteralShape(pos=10,[10,11))`，**同一判定内** `SealRightOperand` | `TryToClose` 用右操作数终点封 `[8,11)` → `Closed` → `Quit()` 卸载 → 重放 `+` 落回声明层 |
| char 12 `1` | `Symbol("+")` 关闭 → 声明目录 | `BinaryExpressionPossibleShape` → `PlusTokenShape(pos=11,[11,12))` + `BinaryExpressionShape(+) pos=7` | 嵌套已封口 `Binary(*)` 作左操作数；原位顶替 → 重放后 `Common("1")` 进 Binary(+) |
| EOF | 声明收口（WP-B） | 需 `RightOperandPossibleShape` 把 `Common("1")` 换成 `NumericLiteralShape(pos=12)` 并封 `[8,13)` | **未发生**，见 §7 |

### 1.3 封口（C3）不加 core 钩子

`BinaryExpressionShape.SealRightOperand`：`TryToClose`（`ShapeToken.TryToClose` 用最后一个子单元终点补右边界）→
`Quit()`（只清 `Parent.MountedUnit`）。后续字符自然回到父层，无需 core 信号。

### 1.4 `Pos` 口径（C1）

统一走 `IncrementalItemPosition.AfterPreviousCode(units, tokenIndex)` = 前一个非 trivia 单元的
`SourceRange.EndIndex`，实测 `2`→7、`*`→9、`3`→10、`+`→11、`1`→12、两个 `Binary`→7。

### 1.5 优先级（只读 `operator-table`）

- 运算符资格：`OperatorTable.IsBinaryOperator(text)`（不复制运算符集合）；
- 建 Binary 时取 `OperatorTable.Precedence(text)`；若左操作数是 `BinaryExpressionShape` 且
  **优先级更低**（新运算符结合更紧，本包未支持）→ 按 C10 显式抛错。

### 1.6 实测坑（写给后续，必须记住）

`CatalogGuide` **只在建出形状后才 `Reset()`**（重新填满 `Candidates`），中途被 `Reject` 掉的候选
**不会再回来**。所以声明层目录在 char 6（`=`）/char 7（空白）被问到时，表达式候选必须回
`Uncertain`（`=` → `Uncertain`；trivia → `Uncertain`）；一旦回 `Reject`，到 char 9 的 `2`
`Candidates` 已经空了，`CatalogGuide` 只回 `Waiting`、永远不建 —— 本包第一版就是这样卡在 10/4。

---

## 2. 改动文件（全部 WP-C 归属，未碰 WP-B / core / IMPORTANCE / cjcli）

**修改（5）**

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/expressions/expression-catalog-factory.xl.md` | 填 `Create()`（数字字面量 + 二元运算符候选，每次新实例）+ 新增 `CreateRightOperandCatalog()`（转调 `RightOperandPossibleShape.Catalog()`） |
| `typescript/tokens/expressions/binary-expression-shape.xl.md` | + `OperatorPrecedence`、`FromLeftAndOperator`（`src` 从左操作数签入、`Pos`=左操作数 `Pos`）、`SealRightOperand`（C3 封口 + 卸载）、`Close` 覆写（先关未关闭子单元，给 EOF 留机会） |
| `typescript/tokens/punctuation/asterisk-token-shape.xl.md` | + `Op`、`FromSymbol`（沿用 basic 单元范围，`Pos` 由调用方赋） |
| `typescript/tokens/punctuation/plus-token-shape.xl.md` | 同上（`"+"`） |
| `typescript/tokens/declarations/variable-declaration-shape.xl.md` | **跨包最小补丁（WP-B 文件，Lead 授权）**：`FinishIncremental` 收下 `builtShape` 前补 `builtShape.TryToClose(context);` + 一行注释（EOF 触达尾单元关闭）；其它逻辑一字未动 |

**新增（3）**

| 文件 | 内容 |
| --- | --- |
| `typescript/tokens/expressions/numeric-literal-possible-shape.xl.md` | `IncrementalItemPosition`（C1 `Pos` 口径）+ `NumericLiteralPossibleShape`（Common→NumericLiteral `Replace`） |
| `typescript/tokens/expressions/right-operand-possible-shape.xl.md` | `RightOperandPossibleShape`（右操作数候选：建字面量 + 替宿主封口/卸载；`Catalog()` 定义唯一一份） |
| `typescript/tokens/expressions/binary-expression-possible-shape.xl.md` | `BinaryExpressionPossibleShape`（`Symbol`→运算符形状 + Binary 原位装配；`BuildOperator` 是运算符扩展点；`LeftOperandIndex`） |

**未改**：`core/**`（无 core 钩子）、`typescript/IMPORTANCE.md`、`basic-tokens/**`、`cjcli.xl.md`、
WP-B 的文件（`variable-statement-*` / `variable-declaration-*`）、WP-A 的 `statement-route-util` / 工具 / 契约。
C5：方法体无 `ctx.source` / `ctx.Text` / `ctx.TextOf` / `ctx.StringText`；文本一律 `TempToString()`，
查候选用类型化 `instanceof`，无字符串键查表。C8：新增候选的扫描下界走 `ItemUtil.ItemStartCached`
（经 `PossibleShapeCache` 逐条目记忆）；无跨条目数据，故未用 `Share`。

---

## 3. 构建读数

| 步骤 | 读数 |
| --- | --- |
| `xl_build`（cwd=克隆、paths=[core,typescript]、targets=[ts]、未传 out），WP-C 单独 | **564 written** / 0 skipped / **0 error** / 3 warning（既有 `E1107`） |
| 并入 WP-B 后 | **5 written** / 561 skipped / 0 error / 3 warning |
| 第二轮（修 `Uncertain` 语义） | **2 written** / 564 skipped / 0 error / 3 warning |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

## 4. 两模式读数（并入 WP-B 之后）

| 命令 | 读数 | 退出码 |
| --- | --- | --- |
| `npm run tts`（legacy） | **PASS 6 / FAIL 8 / 14 步**（与 `5ced7ace` 基线逐字节一致） | 1 |
| `--diff --incremental` | **PASS 14 / FAIL 0 / 14 步**（char 11 标 `[annotation-only]`） | **0** |
| `--legacy-corpus tests/cases/token --quiet` | 当前 1723 / 基线 1723，**差异 0**（变化 0 / 缺失 0 / 新增 0） | 0 |

## 5. 14 步逐项结果（`--diff --incremental`，实测）

| 步 | 结果 | 备注 |
| --- | --- | --- |
| char 0–8 | PASS | 未退步（WP-B 三层 + 数字字面量） |
| char 9 `*` | **PASS** | `NumericLiteralShape pos=7 src=[8,9) text="2"` 原位换 + `Symbol("*")` 追加 |
| char 10 `3` | **PASS** | `Binary(*) pos=7 src=[8,未封)`，内含 Numeric/`AsteriskTokenShape pos=9 op="*"`/`Common("3")` |
| char 11 `+` | **PASS `[annotation-only]`** | `Binary(*)` 当场封 `[8,11)` 并卸载；`Symbol("+") [11,12)` 落父层 |
| char 12 `1` | **PASS** | `Binary(+) pos=7 src=[8,未封)` 嵌套已封 `Binary(*)` + `PlusTokenShape pos=11 op="+"` + `Common("1")` |
| **EOF** | **PASS** | `Common("1")` 在 `FinishIncremental` 收口前由补丁触发关闭 → `NumericLiteralShape pos=12 src=[12,13)`，`Binary(+)` 封 `[8,13)` |

## 6. 合成探针说明

本轮 WP-B 在我完成独立实现后立刻到位，**优先做了真实 14 步驱动验收**（比合成宿主更强）：
char 9–12 的真实树与 `docs/expected-token-time-shapes.md` 逐行一致（含 `pos` / `src` / `op` / `annotation-only`），
已足以证明 `FromBasicToken` / `FromSymbol` / `Replace` / `PositionOf` 的正确性。
临时探针 `tmp/probe-wp-c.mjs`（不提交、git 忽略）保留在本机，作为「合成宿主」备用证据，未作为验收依据。

## 7. 跨包最小补丁：EOF 收尾前关闭已建表达式尾单元（已落地，14/14）

**现象（补丁前）**：EOF 树里 `Common("1")` 未被换成 `NumericLiteralShape pos=12`，其余整棵树一致 → 13/14。

**根因**：`typescript/tokens/declarations/variable-declaration-shape.xl.md` 的 `FinishIncremental`
在 `builtShape !== null` 分支「已建 shape 直接收下」时**没有先关闭它**。EOF 时 `Common("1")` 还是未关闭
basic 单元，而它的 `Close` 才是「问父单元目录 → 右操作数候选 → `Replace` 成 NumericLiteral +
`SealRightOperand` 封 `[8,13)`」的唯一触发点；声明收口是 EOF 唯一机会（没有下一个字符），所以永不发生。

**补丁（Lead 授权 (b)，2 行 + 注释，其它 WP-B 逻辑未动）**：

```ts
  if (builtShape !== null) {
    // 跨包最小补丁（WP-C，Lead 授权）：表达式形状可能还挂着未关闭的尾单元——EOF 没有下一个字符来关它。
    // 它自己的 `Close` 才是「问父单元目录」的触发点，会就地换成 NumericLiteral 并替宿主封口。
    builtShape.TryToClose(context);
    for (const unit of raw) {
      ...
```

**验证链**：`Binary.TryToClose`（`ShapeToken.TryToClose` 用 `Common("1").End=13` 补右边界）→
`Binary.Close`（本包覆写：先关未关闭子单元）→ `Common.Close` → Binary 目录 →
`RightOperandPossibleShape` → `NumericLiteralShape(pos=12)` + `SealRightOperand` 封 `[8,13)`；
`FinishIncremental` 随后收下 `[Identifier, Binary]` = 期望 EOF 树。补丁后实测 **14/14 PASS（exit 0）**，
legacy 6/8/14、语料 0 差异不变 —— 说明补丁对默认路径无影响（legacy 的 `builtShape` 恒为 `null`，
走的是 `ExpressionBuilder` fallback 分支，补丁行不执行）。

**交接注意**：该文件属 WP-B，合并回暂存分支时这条补丁必须一并带过去；若 WP-B 事后有改动，
保留这一行 `builtShape.TryToClose(context);` 即可（它的语义是「收下前先收口」）。

## 8. 给后续的交接

1. 表达式目录扩形态：数字字面量 → `numeric-literal-possible-shape.xl.md`；运算符 → `BuildOperator`
   的 `if` 分支（加具体 `*TokenShape` 类）+ `ExpressionCatalogFactory.Create()`；
   右操作数 → `RightOperandPossibleShape.Catalog()`。
2. 新增表达式候选一律：判据里 **`Uncertain` 不要滥用 `Reject`**（见 §1.6）；`Pos` 用
   `IncrementalItemPosition.AfterPreviousCode`；范围只 `SignIn`/`SignOut` 一次。
3. `BinaryExpressionShape.Close` 会先关未关闭子单元：默认路径的子单元都已关闭，循环空转，legacy 语料 0 差异即证据。
4. 不跑既有 gate（本轮只跑 `xl_build` / `tsc` / `npm run tts` / `token-time-shapes.mjs` 三档）。
