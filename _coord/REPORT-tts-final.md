# REPORT-tts-final — 「basic tokens → shape」增量重构最终报告（WP-E）

- **暂存分支**：`refactor/token-time-shapes` @ **`b9b47f21`**（本报告定稿基线）
- **canonical**：`C:\Users\Admin\Documents\GitHub\xl-example`（`feature/all-possible` @ `3a0623c3`，全程只读）
- **本报告分支**：`tts-wp-e`（本克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-e`）
- **角色**：WP-E = 收尾（文档、npm 脚本、最终报告）。**未改任何解析行为**：本报告涉及的改动全部是
  `.md` / `package.json` / 文档，`typescript/tokens/**` 与 `core/**` 一个字节未动。
- **结论**：增量模式在目标用例上 **14/14**（exit 0），legacy 基线 **6/8/14**（exit 1，未变），
  legacy 语料 **1723 文件 / 差异 0**，构建 0 error、tsc 0 错。开关默认 `false`，默认解析路径零变化。

---

## 0. 一句话

旧路径在 char 5 建一个**空候选目录的通用 `StatementShape` 壳**、EOF 时由 `StatementBuilder` **一次原子建树**；
新路径（开关 ON）在 char 5 就按目标文档分出 `VariableStatementShape → VariableDeclarationListShape →
VariableDeclarationShape`，之后**每个 token 关闭时就地建 shape / 原位替换 / 右操作数关闭即封口**，
EOF 只做收口。两条路径并存，默认走旧路径。

---

## 1. 背景与目标

- **背景**：仓库的解析是「字符 → basic token → 父单元重算候选 → 建 shape」。basic token 之外没有任何
  增量建 shape 的能力：语句层只有一个通用 `StatementShape` 壳，树的真正形状要等 EOF 由 `StatementBuilder`
  用 basic token 缓冲区**一次性**装配出来。`docs/expected-token-time-shapes.md` 描述的「逐字符长出来的树」
  在旧实现里根本不存在，因此目标用例的 14 步只对得上 6 步。
- **目标**：让 shape 树按文档**逐字符增量长出来**（14 步 = 13 char + EOF），并把这件事做成可开关、可回退、
  可验证的：默认路径逐字节不变，目标用例用开关打开后 14/14。
- **口径**：唯一验收口径是 `docs/expected-token-time-shapes.md` 的 14 步（不是 15 步 —— 早期报告里的
  「15 步」是笔误，样本 `let x = 2*3+1` 是 13 个字符）。

## 2. 分包与波次

| 波次 | 成员 | 产出 | 关键提交 / 报告 |
| --- | --- | --- | --- |
| T1 | tts-harness | 目标用例工具 `tests/parse/token-time-shapes.mjs` + `let-x` fixture + `npm run tts` + 构建配方 | `8215eedb`、`fffb0b8d`；`_coord/REPORT-tts-harness.md` |
| T2 | tts-plan | 现状侦察 / 差距分析 / 分包方案（WP-1…WP-5 的原始拆分） | `49fdb695`；`_coord/REPORT-tts-plan.md` |
| merge-1 | merge-stage | T1 + T2 合并（无冲突），基线 6/8/14 复现 | `9e587bea`、`b0207ee1`；`_coord/REPORT-merge-1.md` |
| WP-A | tts-wp-a | 契约 C1–C11、增量开关、`ExpressionCatalogFactory` stub、工具扩展（`--incremental`/`--mode`/`--quiet`/`--legacy-corpus`/`--write-baseline`）、语料基线 | `d35736b5`；`_coord/REPORT-tts-wp-a.md` |
| merge-2 | merge-stage | WP-A 合并（无冲突，7 files +7912/−43） | `8fcdf654`；`_coord/REPORT-merge-2.md` |
| WP-B | tts-wp-b | 变量声明三层增量（char 5–8）、EOF 收口与 fallback | `18d66eaf`；`_coord/REPORT-tts-wp-b.md` |
| WP-C | tts-wp-c | 表达式增量 + 二元运算与封口（char 8–12）、EOF 尾单元关闭补丁 | `5112523a`、`1082fb20`；`_coord/REPORT-tts-wp-c.md` |
| merge-3 | merge-stage | WP-B / WP-C 合并（无冲突）、构建、14/14 验收、清理 | `70a756e6`、`bf1b450d`；`_coord/REPORT-merge-3.md` |
| WP-E | tts-wp-e | 收尾文档、npm 脚本、最终报告（本文件） | 本分支；`_coord/REPORT-tts-final.md` |

- 实际落地的包与最初 WP-1…WP-5 的对应关系：WP-B ≈ WP-1 + 收口（WP-4 的增量子集）、WP-C ≈ WP-2 + WP-3、
  WP-A ≈ WP-5 的接线部分。**core 未改**（原判断成立：调度链已经够用，缺的是 typescript 层的形状）。
- 全程未跑既有 gates（契约 C7）：`npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*` / `cases:*`。

## 3. 架构前后对比

### 3.1 旧过程（默认，开关 `false`）

```text
char 0..4   basic token 全量缓冲（Common("l")/"e"/"t"/" "/"x"）
char 5      VariableStatementPossibleShape 建通用 StatementShape 壳（候选目录为空）
char 6..12  basic token 继续进缓冲
EOF         StatementBuilder 用整段 basic token 一次性原子建树（ExpressionBuilder 装配初始化器）
```

- 树上整个解析过程中只有 `StatementShape` 一个容器，**没有** `VariableDeclarationListShape` /
  `VariableDeclarationShape` / `BinaryExpressionShape`；目标用例 char 5–12 因此对不上。
- 优点：一套代码覆盖全部语句形态；缺点：没有「逐字符树」，且建树时机集中在 EOF 一处。

### 3.2 新过程（开关 `true`，仅目标文法子集）

```text
char 5      VariableStatementPossibleShape 分流（IsIncrementalVariableShapesEnabled）
            → 一次 BuildByIndex 建三层：VariableStatementShape(pos=0) → VariableDeclarationListShape(pos=0)
              → VariableDeclarationShape(pos=3, src 从 4)（C1 签入）
            → Common("x") 用 IdentifierShape.FromBasicToken 原位换成 IdentifierShape(pos=3,[4,5))
            → 挂载链 host → statement → list → declaration，之后字符直接落进最内层
char 6..7   "=" / 空白 trivia 落进 declaration.Data；表达式目录被问到时回 Uncertain（不消耗候选）
char 8      NumericLiteralPossibleShape → NumericLiteralShape 原位 Replace
char 9      BinaryExpressionPossibleShape → 运算符 TokenShape + BinaryExpressionShape 顶替左操作数那一格
char 10     RightOperandPossibleShape → NumericLiteralShape，同一判定内 SealRightOperand 封右边界并 Quit 卸载
char 11..12 父层接力：Symbol("+") 再建 BinaryExpressionShape(+)，已封的 Binary(*) 作左操作数
EOF         VariableStatementShape.TryToClose 按挂载链由内向外收口；
            FinishIncremental 收下前先 builtShape.TryToClose(context) → 尾单元关闭 → 封 [8,13)
```

- 每个候选都是三入口（`ComputeByIndex` / `IsBuildable` / `BuildByIndex`），遵守 C8（`PossibleShapeCache` +
  `ItemUtil.ItemStartCached`）与 C5（无 `ctx.Text` / 字符串键查表）。
- **没有 core 钩子**：封口与卸载全部由 `TryToClose` + `Quit()` + `Replace` 在 typescript 层组合完成。
- 旧路径（`StatementShape` / `StatementBuilder` / `BuildFromShell` / `FinishShell` / `ExpressionBuilder`）
  **全部保留为 fallback**，开关 `false` 时逐字节不变。

## 4. 改动文件全表（按包分组，相对 `5ced7ace`）

规模：**22 files changed, +9299 / −48**（含本报告前的 6 份 `_coord/` 文档与语料基线）。

### 4.1 WP-A（契约 / 开关 / 工具 / 基线）

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/statement-route-util.xl.md` | M +25：静态字段 `EnableIncrementalVariableShapes = false`、静态方法 `IsIncrementalVariableShapesEnabled()`（既有字段默认值未动） |
| `typescript/tokens/expressions/expression-catalog-factory.xl.md` | A +60：`Create()` stub（返回 `[]`），后由 WP-C 填充；`CreateRightOperandCatalog()` 由 WP-C 补 |
| `tests/parse/token-time-shapes.mjs` | M +454：`--incremental` / `--mode` / `--quiet` / `--expected` / `--legacy-corpus` / `--write-baseline`；char 11 期望侧注解容错；JSON `mode`；语料指纹采集/比对 |
| `tests/parse/token-time-shapes/README.md` | M：14 步口径、选项表、退出码、两种模式、语料基线、当前读数（WP-E 再次更新） |
| `tests/parse/token-time-shapes/legacy-corpus-baseline.json` | A +6915：1723 文件 XML 指纹基线（确定性产物） |
| `_coord/CONTRACT-tts-incremental.md` | A +260：C1–C11 + 接口签名 + 验收配方；WP-E 追加「最终实现与实测坑」 |
| `_coord/REPORT-tts-wp-a.md` | A +204 |

### 4.2 WP-B（变量声明三层，char 5–8）

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/variable-statement-possible-shape.xl.md` | M +6：`BuildByIndex` 开头的增量分流（开关 ON 时交给 `IncrementalVariableStatementBuilder.Build`） |
| `typescript/tokens/declarations/variable-declaration-possible-shape.xl.md` | A +142：`IncrementalVariableStatementBuilder`（一次建三层、按归属搬 basic 单元、挂载链、挂 `CatalogGuide`） |
| `typescript/tokens/declarations/variable-declaration-end-possible-shape.xl.md` | A +60：`VariableDeclarationEndPossibleShape`（VD 终结候选，C8；未支持形态按 C10 抛错） |
| `typescript/tokens/declarations/variable-declaration-shape.xl.md` | M +114：`Incremental` 字段、`TryToClose`、`FinishIncremental`（C2 字段提取 + EOF fallback 表达式建树）**+ WP-C 的 2 行跨包补丁** |
| `typescript/tokens/statements/variable-statement-shape.xl.md` | M +32：`Incremental` 字段 + `TryToClose`（EOF 由内向外收口三层） |

### 4.3 WP-C（表达式增量与封口，char 8–12 + EOF）

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/expressions/expression-catalog-factory.xl.md` | M（与 4.1 同一文件，+60 为合计）：填 `Create()` 候选 + `CreateRightOperandCatalog()` |
| `typescript/tokens/expressions/binary-expression-shape.xl.md` | M +74：`OperatorPrecedence`、`FromLeftAndOperator`、`SealRightOperand`（C3）、`Close` 覆写（先关未关闭子单元） |
| `typescript/tokens/expressions/binary-expression-possible-shape.xl.md` | A +141：`BinaryExpressionPossibleShape`（`Symbol` → 运算符形状 + Binary 原位装配；`BuildOperator` 是运算符扩展点） |
| `typescript/tokens/expressions/numeric-literal-possible-shape.xl.md` | A +114：`IncrementalItemPosition`（Pos 口径）+ `NumericLiteralPossibleShape` |
| `typescript/tokens/expressions/right-operand-possible-shape.xl.md` | A +87：`RightOperandPossibleShape`（右操作数 + 替宿主封口/卸载；`Catalog()` 唯一来源） |
| `typescript/tokens/punctuation/asterisk-token-shape.xl.md` | M +34：`Op`、`FromSymbol` |
| `typescript/tokens/punctuation/plus-token-shape.xl.md` | M +30：同上（`"+"`） |

### 4.4 协调文档与收尾（WP-E 本轮）

| 文件 | 改动 |
| --- | --- |
| `tests/parse/token-time-shapes/README.md` | M：补 14 步口径、全选项用法（`--incremental` / `--mode` / `--quiet` / `--expected` / `--legacy-corpus` / `--write-baseline`）、`annotation-only` 规则、退出码、增量 14/14 验收口径 |
| `package.json` | M：新增 `tts:incremental`、`tts:corpus`（保留原 `tts`） |
| `_coord/CONTRACT-tts-incremental.md` | M：追加「最终实现与实测坑」（char 6 `Uncertain`、EOF 尾单元 `TryToClose`、2 行跨包补丁、`Catalog()` 单一来源、默认 false 的理由、最终读数） |
| `docs/token-time-shapes-incremental.md` | A：增量模式一页纸（开关、时序、覆盖边界、验证、与目标文档的关系） |
| `_coord/REPORT-tts-final.md` | A：本报告 |

**未改**：`typescript/IMPORTANCE.md`、`core/**`（含 `core/syntax/basic-tokens/**`）、
`docs/expected-token-time-shapes.md`、`tests/parse/token-time-shapes/let-x.expected.txt`、`cjcli.xl.md`、
既有 gates、`package.json` 里除新增两个脚本外的任何字段。

## 5. 验收证据

全部在本克隆（`tts-wp-e`，HEAD = `b9b47f21` + 本报告的 docs 提交）实测，环境为本机 Windows / node。

### 5.1 构建

| 项 | 读数 |
| --- | --- |
| `xl_build`（`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、**未传 `out`**） | **566 written / 0 skipped / 0 planned / 0 error / 3 warning**；566 = 560 基线 + WP-A 1 + WP-B 2 + WP-C 3 |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| 3 条 warning | 均为既有 `E1107`（`GetAccessorPossibleShape` / `IndexSignaturePossibleShape` / `SetAccessorPossibleShape` 重复声明），非本次引入 |

### 5.2 目标用例（14 步 = 13 char + EOF）

| # | 命令 | 读数 | exit |
| --- | --- | --- | --- |
| a | `npm run tts`（legacy，默认开关 false） | **PASS 6 / FAIL 8 / 14 步**（char 0–4 与 EOF PASS，char 5–12 FAIL，与重构前 `5ced7ace` 一致） | **1**（基线如此） |
| b | `npm run tts:incremental` | **PASS 14 / FAIL 0 / 14 步**，char 11 标 `[annotation-only]`，末行「其中 1 步仅差文档内嵌注释，计 PASS」 | **0** |
| b′ | 同 b 连跑两次，stdout 逐字节比对 | 两次 sha256 均 `4EEEDB2E0DDB377AB1FC6E5D428BA0EFE2C78DE3387B662186211542027D9154`，长度均 **1322** 字节；stderr 空 | 0 |

- 14/14 的逐项对应见 `_coord/REPORT-tts-wp-c.md` §5（char 0–8 未退步、char 9–12 与 EOF 全绿）。
- char 11 的 `[annotation-only]` 是**允许项**：文档期望块里那行 `← 3 关闭即封口` 是注释而非 shape 字段；
  工具只对期望侧尾部注解容错，且该步的实际树与去注解期望逐行相等。

### 5.3 legacy 语料零回归

| 命令 | 读数 | exit |
| --- | --- | --- |
| `npm run tts:corpus`（= `--legacy-corpus tests/cases/token`） | **当前 1723 / 基线 1723，一致 1723，差异 0**（变化 0 / 缺失 0 / 新增 0），耗时 1.22s | **0** |

- 覆盖 `tests/cases/token/**/*.ts(x)`（1719 `.ts` + 4 `.tsx`）+ `samples/*.ts`，逐文件整文档
  `context.Process(document)` → `Root.ToXmlString()` 的 sha256；**解析抛异常的 7 个文件也进基线**
  （指纹 = `sha256("ERROR\n" + 错误描述)`），所以错误文案的变化同样会被抓到。
- 语料模式固定 legacy（即使给 `--incremental` 也按 legacy），用途就是证明默认路径零变化。

### 5.4 工作区

- `git status --porcelain`：干净（`dist` / `build` 被 `.gitignore` 忽略）。
- 本报告的改动全部是 `.md` / `package.json`，**没有触碰任何 `.xl.md` 解析源码** ⇒ 「是否有行为变化：**无**」。

## 6. gates 结论

**见 `_coord/REPORT-gates-tts.md`；本报告定稿时以该报告为准。**

- 定稿时该文件**尚未出现在 `refactor/token-time-shapes` 分支上**（本克隆的 `_coord/` 目录与 `git log` 均无），
  因此本报告不代述 gate 读数，也不声称 gates 已通过。
- 本阶段（契约 C7）的验收由目标用例 + 语料基线构成，二者见 §5；既有 gates 由另一位成员统一运行，
  其结论只以 `_coord/REPORT-gates-tts.md` 为准。

## 7. 开关：为什么默认 `false`，怎么启用

**默认 `false`**（契约 C4，Lead 决策），理由：

1. 默认路径就是全语料 / 既有 gates 的口径；增量模式只覆盖目标文法子集，未支持形态按 C10 抛错，
   默认 ON 会把大量既有用例从「解析成功」变成「显式抛错」。
2. 默认关 ⇒ 增量形状**不可能**改变任何一份既有产物：实测 legacy 6/8/14 与语料 0 差异都是这句话的证据，
   也让 WP-A/B/C 能分步落地而不背回归风险。
3. 目标工具是唯一打开入口（`applyMode`），同一进程可交替两种模式；`SourceFileRunner.ParseCore` 只翻
   `EnableShellExpressions`，不碰本字段，语料基线不会混入增量状态。
4. 翻默认值的时机应由 Lead 决定，前提至少是 C10 的覆盖边界消失 + 全量 gates 在增量模式下重跑通过；本阶段不满足。

**启用方式**（仅用于目标用例 / 实验，不用于 CI）：

```powershell
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental
npm run tts:incremental
```

字段名是 `StatementRouteUtil.EnableIncrementalVariableShapes`（只写字段）；判断一律走
`StatementRouteUtil.IsIncrementalVariableShapesEnabled()`（唯一读入口）。

## 8. 覆盖边界与后续路线

**当前覆盖**：`let` / `const` / `var` + 单个 `Common` 标识符 + 数字字面量或 `*` / `+` 二元表达式，
即 `let x = 2*3+1` 的 14 步路径。**不支持即显式抛错**（C10，`增量变量形状未支持：<stage> <形态>`），
不静默产错树。

**后续路线**（每一步都跑同一条验收链）：

1. **类型注解**（`:` + 类型目录）：`VariableDeclarationEndPossibleShape` 加 `ColonTokenShape` 分支 + 类型候选目录。
2. **多声明**（`,`）：列表层重启声明（`VariableDeclarationListShape` 接 `,` 再建下一个声明），列表终结候选补 `,`。
3. **解构**：`ObjectBindingPatternShape` / `ArrayBindingPatternShape` 作为绑定名候选，替代「只认单个 `Common`」。
4. **其它运算符**：`BinaryExpressionPossibleShape.BuildOperator` 扩一个 `if` 分支 + `ExpressionCatalogFactory.Create()`
   加对应 `*TokenShape`；优先级只看 `OperatorTable`，**不要复制运算符表**（复制即漂移）。
5. **更多表达式形态**：调用 / 成员访问 / 括号 / 一元；右操作数候选与声明层候选共用
   `RightOperandPossibleShape.Catalog()`，不要各写一套。

## 9. 如何复现（命令清单）

```powershell
# 0) 克隆 + 分支 + node_modules（本机 node_modules 从 canonical 复制）
git clone --branch refactor/token-time-shapes C:\Users\Admin\Documents\GitHub\xl-example tts-wp-e
git -C tts-wp-e checkout -b tts-wp-e
robocopy C:\Users\Admin\Documents\GitHub\xl-example\node_modules tts-wp-e\node_modules /E

# 1) 构建（本机无 xl CLI）：xl_build 工具 cwd=<克隆>、paths=["core","typescript"]、targets=["ts"]、不传 out
node node_modules/typescript/bin/tsc -p .

# 2) 四组读数
npm run tts                    # legacy：PASS 6 / FAIL 8 / 14，exit 1（基线）
npm run tts:incremental        # 增量：PASS 14 / FAIL 0 / 14，exit 0
npm run tts:corpus             # 语料：1723 / 差异 0，exit 0
git status --porcelain         # 必须为空

# 3) 附加证据
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --from-doc   # 文档漂移检测
node tests/parse/token-time-shapes.mjs --legacy-corpus --quiet                                   # 一行汇总
```

不跑 gates（`npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*` / `cases:*`）。

## 10. 风险与注意事项

1. **不要删 legacy fallback**：`StatementShape` 壳、`StatementBuilder`、`BuildFromShell` / `FinishShell`、
   `ExpressionBuilder` 都是默认路径与未覆盖形态的兜底。增量模式只覆盖一小块文法，删掉即全语料崩。
2. **不要复制优先级表 / 运算符集合**：资格走 `OperatorTable.IsBinaryOperator`、优先级走
   `OperatorTable.Precedence`；复制一份就会在两处漂移，且 `direct:lint` 会抓字符串取文本。
3. **不要给候选乱用 `Reject`**：`CatalogGuide` 只在建出形状后 `Reset()`，被 `Reject` 的候选不再回来；
   「现在还建不了、以后可能建」必须是 `Uncertain`（char 6 的 `=` 就是这样卡过 10/4）。
4. **EOF 的尾单元补丁必须保留**：`FinishIncremental` 里的 `builtShape.TryToClose(context);`（2 行，
   落在 WP-B 的文件里）是 EOF 封口的唯一触发点；删掉会退回 13/14。
5. **不要手改期望文件 / 文档**：`let-x.expected.txt` 由 `--sync-expected` 生成，
   `docs/expected-token-time-shapes.md` 是口径本身；为让 diff 变绿而改它们等于自欺。
6. **不要改 `core/**`**：本重构零 core 改动；封口 / 卸载全部由 typescript 层组合完成。
7. **测试与基线是确定性产物**：两次跑必须逐字节一致；`legacy-corpus-baseline.json` 无时间戳，
   重跑 `--write-baseline` 应得到相同文件。
8. **默认开关不要顺手翻**：翻 `EnableIncrementalVariableShapes` 的默认值属于 Lead 决策（见 §7），
   翻了就等于把「未支持形态抛错」暴露给全部既有用例。

---

## 附：HANDOFF

- **无代码 HANDOFF**：WP-E 未改任何解析行为，工作区干净，全部验收读数见 §5。
- **给 Lead**：开关默认值是否翻、何时跑 gates，见 §6 / §7；gates 结论以 `_coord/REPORT-gates-tts.md` 为准。
- **给后来扩形态的人**：先读 `docs/token-time-shapes-incremental.md`（一页纸）+ 本报告 §8 / §10，
  再按 `_coord/CONTRACT-tts-incremental.md` 的 C1–C11 与「最终实现与实测坑」动手。
