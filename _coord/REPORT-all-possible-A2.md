# REPORT-all-possible-A2 — 通用二元运算符增量形状（`forms/operator/`）

## 0. 身份与环境

| 项 | 值 |
| --- | --- |
| 任务 | task-11 — WP-A2：运算符归约（全部二元 / 一元 / update / 括号 / 再结合，约 41 条） |
| 分支 | `feat/a2`（只提交本地分支，**未 push origin**） |
| 克隆 | `C:\Users\Admin\Documents\GitHub\xl-example-set\a2-operators`（`node_modules` = canonical 的 junction） |
| base | `base-e0b` = `e0b-initializer/feat/e0b` @ `f62730b0`（含 E0a 地基 + E0b 总闸） |
| 依据 | `plan-all-possible/_coord/PLAN-all-possible.md` §4.1 A2 / §7；`REPORT-all-possible-E0a.md`；`REPORT-all-possible-E0b.md` |

## 1. 验收读数（全部可复算）

| # | 命令 | 读数 |
| --- | --- | --- |
| 1 | `xl_build {cwd=<克隆>, paths:["core","typescript"], targets:["ts"]}`（不传 out） | **570 文件 / 0 error / 3 warning**（3 条均为既有 `E1107`） |
| 2 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 | 迁移前 `node typescript/cases/tts/run.mjs --quiet --json tmp/pre.json` | 380 条：**PASS 355 / FAIL 25**；实测计数 `{"throw":103,"atomic":202,"partial":50,"incremental":25}`；25 条全部是 **NOW-SUPPORTED（→incremental）** |
| 4 | 非目标漂移检查（同一次 JSON 的 expected≠actual 且非 incremental） | **0 条**：除这 25 条外**零漂移**（`as-intersection-type` / `as-union-type` 保持原 `throw`） |
| 5 | `git mv` × 25 → `typescript/cases/tts-impl/cases/<area>/` | 25 条（20 × throw/expressions + 2 × throw/lexical + 3 × partial） |
| 6 | 迁移后 `node typescript/cases/tts/run.mjs --quiet` | **PASS 355 / FAIL 0 / 355，exit 0**（剩余账本零回归；计数 `{"throw":103,"atomic":202,"partial":50,"incremental":0}`） |
| 7 | `node typescript/cases/tts-impl/run.mjs --quiet` | **PASS 70 / FAIL 0 / 70，exit 0**（45 baseline + 25 新增），全部 `incremental` |
| 8 | 同命令跑两遍 `--json` 的 SHA-256 | **逐字节相同**（确定性保持） |
| 9 | legacy 零变化证据 | 两处共享文件改动都只在「旧开关 `EnableIncrementalVariableShapes=true` 的增量路径」上执行（`ExpressionCatalogFactory.Create()` 只在增量分支被调用；`VariableDeclarationEndPossibleShape` 只作为该目录的 `EndPossible`），默认/legacy 模式一步不走；#6/#7 的分类读数与 #8 的确定性是可复算结果 |
| 10 | 25 条迁移 case 的 EOF 树一致 | `run.mjs` 的 `incremental` 分类**只有两模式 EOF shape 树（类名+pos）逐条相同才给**（`divergent` 记 FAIL），#3 的判定即为证据 |

## 2. 实现（1 个新文件 + 4 处改动）

### 2.1 新增 `typescript/tokens/expressions/forms/operator/binary-operator-possible-shape.xl.md`

`BinaryOperatorPossibleShape`：`*` / `+` 之外的**全部二元运算符**（含 `in` / `instanceof` 两个关键字运算符）。

- `ComputeByIndex`：trivia/`=` ⇒ `Uncertain`（E0b 约束 1：中途 `Reject` 就回不来）；
  `*` / `+` ⇒ `Reject`（让给既有候选，否则两候选同格会永远 `Waiting`，E0b 约束 3）；
  数字 `Common` ⇒ `Reject`（留给 `NumericLiteralPossibleShape` 独占）；
  标识符 `Common` ⇒ `Uncertain`（`let x = a < b` 的 `a` 先到，必须活到 `<`）；
  其余二元运算符 ⇒ **有可归约左操作数才** `Accept`。
- `IsBuildable`：左操作数已是形状，**或**是「紧跟 `=` 的首个数字/标识符」（就地物化）。
  这条限制是 `<` 歧义的护栏：`let x = <T>y` 的 `<` 前面没有表达式 ⇒ 不建，保持既有显式拒绝（不产生 divergent）。
- `BuildByIndex`：`OperatorShapeMap.Create(text, PositionBinary, …)` 造运算符形状（`<` → `FirstBinaryOperatorShape`、
  `in`/`instanceof` → 关键字形状，类名即账本 identity）→ `Pos` = 左操作数 `EndIndex`（C1）→
  `BinaryExpressionShape.FromLeftAndOperator` → 原位替换「左操作数 + 运算符」两格 → 挂唯一一份右操作数目录
  `RightOperandPossibleShape.Catalog()`。
- `AppendTo(shapes)`：只追加一个新实例；注册点在 `expression-shape-catalog.xl.md` 的 `// [E-CAT:FRAGMENTS]` 之后一行
  （`BinaryOperatorPossibleShape.AppendTo(shapes); // [A2]`）。

### 2.2 改动 `right-operand-possible-shape.xl.md`（任务书授权的唯一扩展点）

右操作数新增**标识符**分支（`a / b` 的 `b`、`a instanceof B` 的 `B`）：`Common` 非数字且非关键字字面量 ⇒
`Accept`，`BuildByIndex` 里 `IdentifierShape.FromBasicToken` + `Pos`（C1）+ 原位 `Replace`，再 `SealRightOperand`。
**没有复制列表**：目录仍只有 `RightOperandPossibleShape.Catalog()` 这一份。

### 2.3 改动 `binary-expression-possible-shape.xl.md`（1 处让路，为什么必须改）

既有候选的 `ComputeByIndex` 接受**所有**二元运算符（`BuildOperator` 只支持 `*`/`+`，其余直接抛错）。
若新候选也接受同一格，`Candidates.size > 1` ⇒ 永远 `Waiting`（E0b 约束 3）。因此加一条让路规则：
**`*` / `+` 之外、且左操作数已是形状** ⇒ `Reject`（交给新候选）；其余格（左操作数还不是形状）⇒ 保持旧行为
（`<` 的尖括号断言/类型实参歧义、`in`/`instanceof` 等仍走原路径，避免 `angle-assert` 类 case 从 throw 漂移成 divergent）。

### 2.4 改动 `variable-declaration-end-possible-shape.xl.md`（1 处让路 + 1 个判据）

终结候选原来对白名单之外的符号直接抛 `declaration 符号 <op>`。现在：

- `=` ⇒ `Reject`（等初始值）；
- **二元运算符且 `HasReducibleLeft` 为真** ⇒ `Reject`（交给新候选建形状）；
- 其余仍然显式抛错。

`HasReducibleLeft`：前一个非 trivia 单元是形状，或是「紧跟 `=` 的首个标识符/数字」。这条判据让
`as-intersection-type` / `as-union-type`（`as T & U` 的 `&` 前是类型引用 `T`，不是可归约表达式）**保持原 throw**，
从而做到非目标零漂移（#4）。

### 2.5 没有用 `ShapeOperatorStack`（说明理由）

本 WP 的 25 条目标都是「单运算符」或「同优先级左结合」；**唯一需要归约栈的是 `bin-add-mul`（`1+2*3` 的再结合）**，
它仍走既有候选的 `*` 路径并保持原来的显式拒绝（未达成，见 §4）。因此本候选直接用既有的
`BinaryExpressionShape.FromLeftAndOperator` + 右操作数目录，**不引入第二套归约状态**；E0a 的栈留给 A2b。

## 3. 目标 case 结果（任务书 43 条 → 达成 25 条）

| 组 | 目标 | 达成 | 迁移后位置 |
| --- | ---: | ---: | --- |
| throw/expressions `bin-*`（除 add-mul / paren-mul） | 20 | **20** | `tts-impl/cases/expressions/` |
| throw/lexical `let-init-lt`、`let-init-shift` | 2 | **2** | `tts-impl/cases/lexical/` |
| partial/expressions `bin-div`、`bin-instanceof` | 2 | **2** | `tts-impl/cases/expressions/` |
| partial/declarations `let-comparison-init` | 1 | **1** | `tts-impl/cases/declarations/` |
| **合计** | 25 | **25** | — |

## 4. 未达成（18 条）与交接

| 目标 | 数量 | 现状 / 原因 | 交接 |
| --- | ---: | --- | --- |
| `bin-add-mul`（`1+2*3`） | 1 | 需要「把已建 Binary 的右操作数摘下来再包一层」的再结合；本 WP 未接 `ShapeOperatorStack` | **A2b**：用 E0a 归约栈替换 `BinaryExpressionPossibleShape` 的 `*`/`+` 路径（`PushOperator` 的 `Reduce` + 右操作数摘取），验收 `--show throw/expressions/bin-add-mul = incremental` |
| 一元前缀 `unary-bnot/chain-not/minus/not/plus`、`update-*` 4 条、`let-init-unary-plus`、`label-block-let-unary-init` | 12 | 前缀/update 需要「先建表达式节点、操作数后到」的挂载目录（`PrefixOperandPossibleShape`）与 `++`/`--` 前后缀位置判定；本 WP 只做二元，按 ≤10 轮预算交接 | **A2c**：`OperatorShapeMap.Create(…, PositionPrefix/PositionPostfix)` + 自有 operand 目录；注意 legacy 树的 prefix/postfix 节点**没有运算符子节点** |
| `unary-typeof` / `unary-void` | 2 | 同上（前缀），`typeof`/`void` 走 `TypeOfExpressionShape` / `VoidExpressionShape` | 同 A2c |
| `bin-in`（`'a' in b`） | 1 | 左操作数是 `String` 基本单元，需要字符串字面量物化（属 A1/A4 的原子面） | A1 合并后复用其 String 候选，本候选的 `Operand` 只需加一个分支 |
| `bin-paren-mul`（`(1+2)*3`） | 1 | 需要括号候选（`ParenthesizedExpressionShape` + 括号内独立表达式目录），PLAN 里归 `paren-possible-shape.xl.md` | **A2d** |
| `let-subtract-init`、`let-exponent-init` | 2 | 运算本身已能建（`-`/`**`），但 case 带 `;`；`declaration 符号 ;` 属 WP-A6（`;`、`,` 收口） | A6 完成后自动转 incremental，本 WP 不越权 |

## 5. 集成注记（给 Lead 合并与后续 WP）

1. **A1 标识符候选**：本 WP 在标识符格返回 `Uncertain`（为了活到运算符那一格）。A1 合并后两个候选会同时在
   标识符格存活 ⇒ `Waiting`，A1 的标识符不会在那里建（不会 divergent，但会退化）。**合并动作**：把
   `binary-operator-possible-shape.xl.md` 的 `ComputeByIndex` 里「标识符 ⇒ `Uncertain`」改成 `Reject`，
   保留 `IsBuildable` 的「首格就地物化」兜底（1 行改动，就在该方法第 4 条判据）。
2. **`binary-expression-possible-shape.xl.md` 的让路补丁**：文件历史上是 WP-C 的资产，本 WP 只加了 §2.3 那一段
   （含 `ShapeToken` import）。若 A2b 接手 `*`/`+` 的归约栈路径，需要把这段连同旧 `BuildOperator` 一起替换。
3. **`variable-declaration-end-possible-shape.xl.md` 的 `HasReducibleLeft`**：A6（`;`/`,` 收口）之后仍要保留的判据；
   A6 改这个文件时不要删。
4. **注册区**：`expression-shape-catalog.xl.md` 只加了一行 `// [A2]`；按 WP id 排序时 `[A1]` 在前、`[A2]` 其后。

## 6. 风险与已实测的坑

1. **两个候选同格 Accept ⇒ 永远 Waiting**（E0b 约束 3）：本 WP 的所有让路规则都是为此；
   新增 form 候选时必须逐格检查与 `NumericLiteralPossibleShape` / 旧二元候选的互斥性。
2. **`CatalogGuide` 的 `Reject` 是永久的**（E0b 约束 1）：候选在 `=`/trivia 上必须 `Uncertain`。
3. **`<` 的歧义**：只在「左操作数已是形状 / 紧跟 `=` 的首格」建二元；否则保持原 throw，避免 divergent。
4. **右操作数封口后的 `MountedUnit`**：既有 `SealRightOperand` 的 `Quit` 已覆盖单层场景；嵌套/再结合场景留给 A2b。
5. **`;` 收口**不属本 WP：两个带分号的 case 仍 throw（A6）。

## 7. 复算命令

```powershell
xl_build { cwd: "<本克隆>", paths: ["core","typescript"], targets: ["ts"] }   # 570 / 0 error
node node_modules/typescript/bin/tsc -p .                                      # exit 0
node typescript/cases/tts/run.mjs --quiet                                      # PASS 355 / FAIL 0
node typescript/cases/tts-impl/run.mjs --quiet                                 # PASS 70 / FAIL 0
node typescript/cases/tts/run.mjs --show throw/expressions/bin-add-mul          # 仍 throw（A2b）
node typescript/cases/tts/run.mjs --show throw/types/angle-assertion            # 仍 throw（零漂移护栏）
```