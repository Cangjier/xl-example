# CONTRACT-tts-incremental — 「basic tokens → shape」增量重构契约（WP-A 落地版）

- **暂存基线**：`refactor/token-time-shapes` @ `5ced7ace`（canonical 仓库 `C:\Users\Admin\Documents\GitHub\xl-example`，只读）。
- **本契约落地分支**：`tts-wp-a`（本克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-a`）。
- **适用**：WP-B（变量声明三层增量）、WP-C（二元表达式增量）、WP-E（legacy 零回归证据）。
- **状态**：C1–C11 由 Lead 决定；每条的「实现要点」是 WP-A 已验证的落点与实测读数。

> **口径**：目标用例是 **14 步 = 13 char + EOF**（样本 `let x = 2*3+1` 是 13 个字符），不是 15 步。
> `_coord/REPORT-tts-plan.md` 与 `_coord/REPORT-tts-harness.md` 里出现的「15 步」是早期笔误，以本契约为准。

---

## C1 签入口径（来自目标文档，后续包必须遵守）

| shape | `Pos` | `SourceRange` | 说明 |
| --- | --- | --- | --- |
| `VariableStatementShape` | `0` | 从 `0` 起 | 语句首（含前导 trivia） |
| `VariableDeclarationListShape` | `0` | 从 `0` 起 | 与语句同起点 |
| `VariableDeclarationShape` | `3` | 从 `4` 起 | `Pos` = 前一个非 trivia 单元（`let`）的 `EndIndex`；`src` 跳过前导 trivia，从标识符 `x` 的起点 `4` 开始 |
| `IdentifierShape` | `3` | `[4,5)` | `Pos` 同上（= `let` 的 `EndIndex`）；`src` 是标识符代码区间 |

**实现要点**

- `Pos` 是 `ShapeToken.Pos`（`core/syntax/shape-token.xl.md`）：AST 半开区间起点、**含前导 trivia**；`-1` = 未设置。
- 口径与 legacy 的 `Positions[nameIndex]` 逐位一致：`pos = 前一个非 trivia 单元的 SourceRange.EndIndex`；
  首个为 `0`。块体里第一条语句 `pos = 宿主 '{' 的 StartIndex + 1`（`VariableStatementPossibleShape.BuildByIndex` 已有这段算术，WP-B 搬用同一份）。
- `IdentifierShape` 的 `Pos` **不是** `FromBasicToken` 设的（它只设 `SourceRange` 与字段）——WP-B 必须自己赋 `Pos`，
  见下方「给 WP-B 的接口」。

## C2 `=` 与 trivia 的去留（中间态 vs 收口态）

- 解析中间态：`Symbol("=")`、`WrapSymbol`（空白 trivia）等 basic 单元**保留在 shape 的 `Data` 里**，作为 shape 的子单元。
- 拥有它们的 shape 在 `Close` 时**先提取字段**（标识符名、初始化器），**再丢弃** trivia + `=` + 未消费 basic token，
  使 Close 之后 `Data` 等价于 AST children（`typescript/IMPORTANCE.md` §3.5）。
- 因此 char 8（`let x = 2` 的 `2` 到达时）树上仍显示 `Symbol("=")` / `WrapSymbol` 属**正确中间态**，
  不要为了让它提前消失去改 basic token 的消费路径。

**实现要点**

- 提取必须在丢弃之前（`Close` 覆写里先读 `this.Data` 的单元，再 `splice`），否则读到空数组。
- 丢弃范围只到「本 shape 已消费的最后一个单元」；跨层级单元由父 shape 自己的 `Close` 处理，不要越界清理。

## C3 二元表达式右边界封口

- 右操作数 shape 关闭的那一次 build 里：完成 `SignOut(右操作数.SourceRange.End)` 并把后续符号**移交父层**
  （`Replace` / `Add` / `splice` / `Quit` 组合）。
- **不加 core 钩子**：全部在 typescript 层组合实现。`core/` 视为只读。
- **若实现中发现必须改 core**：先停下报告 Lead，不要自行改 core。

**实现要点（实测语义）**

- `ShapeToken.TryToClose` 会在 `SourceRange.End < 0` 时用最后一个子单元终点补；`Close` 覆写里提取字段一定能读到已定范围。
- 关闭后卸载由 `Quit()` → `Parent.MountedUnit` 迁移完成，basic token 的后续字符自动交给父层；不需要额外信号。

## C4 开关粒度：唯一静态开关，默认 false

- 唯一静态开关：`StatementRouteUtil.EnableIncrementalVariableShapes`（`bool`，**默认 `false`**）。
- 只作用于 `let` / `const` / `var` 声明族。
- 默认 false ⇒ 旧「壳 + `StatementBuilder`」路径**逐字节不变**。
- 目标用例工具用 `--incremental` / `--mode incremental` 打开它验证新过程。

**为什么默认 false**（Lead 决策）

1. 默认路径就是全语料 / 既有 gates 的口径；增量过程尚未覆盖全部形态（C10）。
2. 默认关 ⇒ 未接通的形状**不可能**改变任何一份既有产物，WP-B / WP-C 可以分步落地而不背回归风险。
3. 目标工具是唯一打开入口（`applyMode`），同一进程里两种模式可交替出现；`SourceFileRunner.ParseCore` 只翻
   `EnableShellExpressions`，不碰本字段，所以 legacy 语料基线不会混入增量状态。
4. 全部接完、目标用例 14 步全绿之后，由 Lead 决定是否翻默认值。

**已落地接口**（`typescript/tokens/statements/statement-route-util.xl.md`）

- `StatementRouteUtil.EnableIncrementalVariableShapes: bool = false`（静态字段，写在 `EnableShellExpressions` 之后；
  既有字段默认值一个未动）。
- `StatementRouteUtil.IsIncrementalVariableShapesEnabled(): bool`（静态方法，读字段的唯一入口；翻开关只写字段）。

## C5 未来 direct:lint 安全

新增 / 修改的方法体里**禁止**：`ctx.source`、`ctx.Text`、`ctx.TextOf`、`ctx.StringText`，禁止按字符串键查表。

- 现在不跑 `direct:lint`（本阶段禁跑既有 gates），但代码要一次写对；WP-A 新增的 `Create()` / `IsIncrementalVariableShapesEnabled()`
  都是纯字段读写，无上述用法。
- 取文本一律走类型化入口（`TempToString()` / `EscapedText` / `Text`）；查表用类型化集合或 `Map<类, …>` 槽位（见 C8）。

## C6 EOF 不变量

- EOF 最终树必须与 legacy / 目标文档**逐字节相同**（两种模式都是）。
- `StatementBuilder` / `BuildFromShell` / `FinishShell` 一律**保留为 fallback**，不删。
- 证据工具：本契约的「legacy 语料基线」（1723 文件 XML sha256）；WP-E 在重构后复跑比对。

## C7 验收口径

本阶段只用两件事验收：

1. `xl_build`（`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、**不要传 `out`**，默认 `dist`）+ `node node_modules/typescript/bin/tsc -p .`。
2. `tests/parse/token-time-shapes.mjs`：`--diff`（可 `--from-doc`）、`--incremental`、`--legacy-corpus`。

**不跑**任何既有 gate：`npm run gates` / `tests/gates/**` / `samples` / `coverage` / `ast:*` / `cases:*` 全部禁用。

## C8 缓存

- 新增 possible 必须用 `PossibleShapeCache`：
  - `Values` 逐条目判定状态（`GetState` / `SetState`，`CatalogGuide.Reset()` 后清空）；
  - `Share` 跨条目共享（`GetShare` / `SetShare`；**必须自带新鲜度判据**，比如 `Start` / 长度 / 版本号）。
- 记扫描下界用 `ItemUtil.ItemStartCached(units, cache)`（内部走 `PossibleShapeCache.GetItemStart/SetItemStart`，按条目长度作废）。
- 槽位由基类发号（`this.Slot()`），不要拼字符串键、不要读 `constructor.name` 当键（同时满足 C5）。

## C9 不要动

- `typescript/IMPORTANCE.md`
- `core/syntax/basic-tokens/**`
- `cjcli.xl.md`（根级 `xl build` 依赖已删的 `./dawn/*`，必失败）
- 既有 gates / `tests/gates/**`
- canonical 主仓库（`C:\Users\Admin\Documents\GitHub\xl-example`，**只读、不 checkout**）
- `core/` 整体视为只读；需要改先报告 Lead（见 C3）。

## C10 增量模式是全有或全无

- 增量模式只支持目标用例子集（`let x = 2*3+1` 的 14 步路径）。
- 遇到**未支持**的后续形态必须**显式抛错**（`throw new Error("增量模式未支持：<形态>")` 一类），
  便于发现与定位；**不允许**静默产出错误的树。
- 默认 false 不受影响。

**建议错误文案口径**（WP-B / WP-C 统一）：`增量变量形状未支持：<阶段> <形态>`，阶段用 `statement` / `list` / `declaration` / `expression`。

## C11 文件归属（防合并冲突）

| 包 | 独占文件 |
| --- | --- |
| **WP-B** | `typescript/tokens/statements/variable-statement-possible-shape.xl.md`、`variable-statement-shape.xl.md`、`typescript/tokens/declarations/variable-declaration-list-shape.xl.md`、`variable-declaration-shape.xl.md`、新增 `variable-declaration-*-possible-shape.xl.md` |
| **WP-C** | `typescript/tokens/expressions/expression-catalog-factory.xl.md`（**WP-A 只建 stub，之后交给 WP-C 所有者**）、`binary-expression-shape.xl.md`、新增 binary possible、`numeric-literal-shape.xl.md`、`asterisk-token-shape.xl.md`、`plus-token-shape.xl.md` |
| **WP-A** | `typescript/tokens/statements/statement-route-util.xl.md`、`identifier-shape.xl.md`、`expression-catalog-factory.xl.md`（仅建 stub）、`tests/parse/token-time-shapes.mjs`、`tests/parse/token-time-shapes/**`、`_coord/CONTRACT-tts-incremental.md`、`_coord/REPORT-tts-wp-a.md` |

**规则**：一个文件同一时刻只有一个包在写；跨包需要改别人的文件时先发消息，不改。`_coord/` 下本契约是只读引用，
不要就地改（要改口径在群里说，由 Lead 统一改）。

---

## 目标用例口径与 char 11 注解

- 目标：**14 步 = 13 char（0–12）+ EOF**。
- 重构前正确基线（`5ced7ace`）：**PASS 6 / FAIL 8 / 14 步**，`npm run tts` 退出码 `1`
  （char 0–4 PASS、EOF PASS，char 5–12 FAIL）。
- `docs/expected-token-time-shapes.md` char 11 的 ```text 围栏里有一行行尾注释
  `         ├─ BinaryExpressionShape  pos=7  src=[8,11)   ← 3 关闭即封口`。
- 处理：目标工具对**期望侧**尾部注解（`/\s+←.*$/`）容错——去掉注解后与实际行相等即该行一致，
  该步计 **PASS** 并标注 `[annotation-only]`；**不改文档、不改期望文件**。
- 当前 char 11 的失败是**结构差异**（不在注解上），所以基线仍是 6/8/14；增量模式接完二元表达式后，
  char 11 才应转成 annotation-only PASS。

---

## 给 WP-B 的接口（已在本分支实现并实测）

### 1. 开关

```ts
StatementRouteUtil.EnableIncrementalVariableShapes: bool = false   // 静态字段（只写它）
StatementRouteUtil.IsIncrementalVariableShapesEnabled(): bool      // 静态方法（只读入口）
```

`VariableStatementPossibleShape.ComputeByIndex` 里用 `if (!StatementRouteUtil.IsIncrementalVariableShapesEnabled()) return <旧路径>;`
做分流；增量分支只处理 `let` / `const` / `var`。

### 2. ExpressionCatalogFactory（stub，WP-C 填充）

```ts
ExpressionCatalogFactory.Create(): Array<PossibleShape>
```

- 文件：`typescript/tokens/expressions/expression-catalog-factory.xl.md`。
- **当前返回 `[]`**（WP-A 阶段）；WP-C 负责填候选。
- **每次调用返回新实例**（不进静态缓存）；候选遵守 C8。
- 挂法（WP-B 的 `VariableDeclarationShape.BuildByIndex`，增量模式）：

```ts
this.CatalogGuide = new CatalogGuide(ExpressionCatalogFactory.Create(), endPossible);
```

`endPossible` 是 `VariableDeclarationShape` 自己的终结候选（`;` / ASI / EOF / 逗号边界由它收口）。

### 3. IdentifierShape（**已存在，未改动**；`pos` 由调用方赋）

```ts
IdentifierShape.FromBasicToken(token: Common, context: SyntaxContext): IdentifierShape
```

- 行为：`new IdentifierShape(token.Template)` → 用 `token.SourceRange` `SignIn` / `SignOut` →
  写 `EscapedText`（`HasBackslash` 时走 `DecodeIdentifierEscapes`）→ `TryToClose(context)`。
- **不设 `Pos`**。WP-B 造绑定名时按既有惯例补一行（`typescript/tokens/direct/direct-declaration-assembly.xl.md:71-82` 同口）：

```ts
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = pos;   // pos = 前一个非 trivia 单元的 SourceRange.EndIndex（C1）
```

> **偏离说明**：任务原话是「若没有，补一个 `FromBasicToken(token, pos)`」。实测该静态工厂**已经存在**
> （签名如上，全仓 100+ 处调用，`direct-*` 装配也在用），所以 WP-A 选择**不动它**（改签名会波及既有路径）；
> xl 也不支持同一个类里两个同名方法（也无重载），因此没有新增二参重载。`Pos` 赋值是仓库既有惯例，
> 见上面这行；WP-B 直接用即可。

### 4. 三层形状的 `Pos` / `src` 模板（C1 落地）

- `VariableStatementShape`：`Pos = 语句首（根层 0；块内 `'{'.StartIndex + 1`）`，`src` 从同一位置。
- `VariableDeclarationListShape`：`Pos` / `src` 与语句相同。
- `VariableDeclarationShape`：`Pos = 前一个非 trivia 单元 EndIndex`（`let` 的 `EndIndex = 3`），
  `src` 从首个绑定（标识符）起点 `4`（跳过前导 trivia）。
- `IdentifierShape`：`src` 由 `FromBasicToken` 从 token 取；`Pos` 必须手动赋。

---

## 给 WP-C 的接口

### 1. ExpressionCatalogFactory（WP-C 拥有并填充）

```ts
ExpressionCatalogFactory.Create(): Array<PossibleShape>
```

- 契约：每次调用返回**新实例**（`[]` 也要是新的数组；候选对象不要缓存复用）。
- 候选三入口与目录一致：`ComputeByIndex` / `IsBuildable` / `BuildByIndex`；建形状时自己 `SignIn` / `SignOut`。
- 必须遵守 C8（`PossibleShapeCache` + `ItemStartCached`）与 C5（无字符串取文本 / 字符串键查表）。
- 目标路径从 **char 8（`2`）** 开始：`NumericLiteralShape`（char 8）、`AsteriskTokenShape`（char 9）、
  `NumericLiteralShape`（char 10）、`BinaryExpressionShape(*)` 在 char 11 封口并 `Replace` 原位换出；
  char 12 的 `+`/`1` 走 `BinaryExpressionShape(+)`。**C3 的封口与移交**由 WP-C 在 `binary-expression-shape.xl.md` 里组合实现。
- 详见 `docs/expected-token-time-shapes.md` char 8–EOF 与 `tests/parse/token-time-shapes/README.md`。

### 2. 验收命令

```powershell
# 目标用例（两种模式都必须是 6/8/14；接完表达式后 legacy 仍 6/8/14，incremental 全绿）
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff
node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental

# 默认模式零回归（每次改完 .xl.md 重新 build 后跑）
node tests/parse/token-time-shapes.mjs --legacy-corpus
```

---

## 语料基线（WP-E 用）

- 文件：`tests/parse/token-time-shapes/legacy-corpus-baseline.json`
- 采集：`node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline`
- 比对：`node tests/parse/token-time-shapes.mjs --legacy-corpus`（0 差异 ⇒ exit 0）
- 覆盖：`tests/cases/token/**/*.ts` + `samples/*.ts`，共 **1723** 个文件（1719 `.ts` + 4 `.tsx`），
  **解析抛异常的 7 个文件也进基线**（指纹 = `sha256("ERROR\n" + 错误描述)`）。
- 口径：整文档 `context.Process(document)` → `Root.ToXmlString()`；按相对路径（`/`）排序；sha256。
- **固定 legacy 模式**：即使同时给 `--incremental` 也按 legacy 采集 / 比对（基线用途就是默认模式零回归）。
- 确定性：基线无时间戳；重跑 `--write-baseline` 应得到逐字节相同的文件。

---

## 构建 / 自验配方（本机，无 xl CLI）

1. DSH `xl_build` 工具：`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、**不要传 `out`**。
   - 期望：**561 written**（560 基线 + 新增 `expression-catalog-factory`）/ 3 个既有 `E1107` warning。
2. `node node_modules/typescript/bin/tsc -p .` → exit 0（约 5s）。
3. `npm run tts` → PASS 6 / FAIL 8 / 14 步，exit 1（与 `5ced7ace` 一致）。
4. `node tests/parse/token-time-shapes.mjs tests/parse/token-time-shapes/let-x.ts --diff --incremental` → 同 6/8/14。
5. `node tests/parse/token-time-shapes.mjs --legacy-corpus` → 1723 文件 / 差异 0。
