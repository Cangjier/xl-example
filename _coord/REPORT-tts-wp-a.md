# REPORT-tts-wp-a — 契约 + 增量开关 + 叶子工厂 + 目标工具扩展（WP-A）

- **角色**：重构团队 WP-A（共享任务板 `task-4`，已 claim）。
- **分支**：`tts-wp-a`（本克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\tts-wp-a`），
  从 canonical 仓库只读暂存分支 `origin/refactor/token-time-shapes` @ `5ced7ace` 切出。
- **主仓库**：`C:\Users\Admin\Documents\GitHub\xl-example`，**全程只读、未 checkout**。
- **核心约束遵守**：未改 `typescript/IMPORTANCE.md`、未改 `core/syntax/basic-tokens/**`、未改 `cjcli.xl.md`、
  **未跑任何既有 gate**（gates / samples / coverage / ast:* / cases:* 全部未运行）；`.xl.md` 全部用 read/edit/write 工具改（UTF-8）。
- **状态**：**完成**（无 HANDOFF；验收全绿，见下）。

---

## 1. 做了什么

### 1.1 增量开关（契约 C4）

`typescript/tokens/statements/statement-route-util.xl.md`：

- 新增 `StatementRouteUtil.EnableIncrementalVariableShapes: bool = false`（唯一静态开关，**默认 false**）。
  插在 `EnableShellExpressions` 之后，**既有字段默认值一个未动**（`EnableShellExpressions` 仍 `true`）。
- 新增 `StatementRouteUtil.IsIncrementalVariableShapesEnabled(): bool`（读开关的唯一入口）。
- 方法体是纯字段读（无 `ctx.*` 文本访问、无字符串键查表，满足 C5）。
- 生成物实测（`build/ts/.../statement-route-util.js:43-45`）：
  `static EnableIncrementalVariableShapes = false;` + `static IsIncrementalVariableShapesEnabled() { return ... }`。

### 1.2 表达式候选目录工厂 stub（C8 / C11）

新增 `typescript/tokens/expressions/expression-catalog-factory.xl.md`：

- `ExpressionCatalogFactory.Create(): Array<PossibleShape>` **现在返回 `[]`**（WP-A 阶段空目录）。
- 文件里写清契约：WP-B 的 `VariableDeclarationShape` 增量模式下用
  `new CatalogGuide(ExpressionCatalogFactory.Create(), endPossible)` 挂初始值目录；候选由 WP-C 填；
  **每次调用返回新实例**（不加静态缓存）；候选必须遵守 C8（`PossibleShapeCache` + `ItemStartCached`）、C5。
- 文件归属：本文件由 WP-A 建 stub，**之后交给 WP-C 所有者**（C11）。

### 1.3 Identifier 工厂（校验，未改）

`typescript/tokens/names/identifier-shape.xl.md` **不改**（只读校验）：

- 已有静态工厂 `IdentifierShape.FromBasicToken(token: Common, context: SyntaxContext): IdentifierShape`
  （设 `SourceRange`、`EscapedText`、`TryToClose(context)`；**不设 `Pos`**）。
- 全仓 100+ 处调用（`direct-*` 装配也用），改签名会波及默认路径；xl 也不支持同类同名方法重载，
  故**没有加二参重载**，`Pos` 由调用方按仓库既有惯例赋（`direct-declaration-assembly.xl.md:71-82` 同口）。
  详见 CONTRACT「给 WP-B 的接口」与本文 §6 的偏离说明。

### 1.4 目标用例工具扩展（`tests/parse/token-time-shapes.mjs`）

- **`--incremental` / `--mode legacy|incremental`**：解析前 require 构建产物的
  `StatementRouteUtil` 并把 `EnableIncrementalVariableShapes` 写 `true` / `false`；
  字段名可用环境变量 `TTS_MODE_FIELD` 覆盖；字段不存在时 **stderr 一行提示并按 legacy 继续**（不报错）。
  模式写进输出头部（`模式: legacy（…）`）与 `--json` 的 `mode` 字段（另带 `modeField` / `modeApplied`）。
- **`--quiet`**：diff / dump / 语料模式都只打一行汇总。
- **char 11 行尾注解容错**：只容错**期望侧**尾部 `/\s+←.*$/` 注解——期望行去注解后与实际行相等 ⇒ 该行算一致，
  该步计 **PASS** 并标注 `[annotation-only]`；**不改文档、不改期望文件**。实际行的其它差异照旧 FAIL。
  （若某 FAIL 步里混有注解行，输出另给一行「另 N 行仅差期望侧行尾内嵌注释」提示。）
- **`--legacy-corpus [dir]` / `--write-baseline`**：对 `tests/cases/token/**/*.ts`（+ `samples/*.ts`）
  逐文件**整文档**解析（`context.Process(document)` → `Root.ToXmlString()`），按仓库相对路径（`/` 分隔）排序后
  算 sha256，写 / 读 `tests/parse/token-time-shapes/legacy-corpus-baseline.json`；输出文件数与差异数。
  缺省 dir = `tests/cases/token`；`--write-baseline` 单独给也隐含语料模式。语料模式**固定 legacy**（即使同时给
  `--incremental` 也按 legacy，输出写明），因为它的用途就是证明默认解析路径零回归。
- 解析抛异常的文件**也进基线**（指纹 = `sha256("ERROR\n" + 错误描述)`）；`SyntaxException` 不是标准 `Error`
  （字段是 `Message`），工具做了专门的 `describeError`（含一层 `InnerException`），避免把不同错误都塌成 `[object Object]`。
- **保持原有选项与 6/8/14 基线不变**；README 同步更新（新增选项、14 步口径、561 产物、注解容错口径）。

### 1.5 文档

- 新增 `_coord/CONTRACT-tts-incremental.md`：C1–C11 + 14 步口径更正 + char 11 处理 + 默认 false 的理由 +
  WP-A/B/C 文件归属 + 给 WP-B/WP-C 的确切接口签名 + 构建/自验配方 + 语料基线口径。
- 更新 `tests/parse/token-time-shapes/README.md`。

---

## 2. 文件清单

**修改（3）**

| 文件 | 改动 |
| --- | --- |
| `typescript/tokens/statements/statement-route-util.xl.md` | + 静态字段 `EnableIncrementalVariableShapes = false`、静态方法 `IsIncrementalVariableShapesEnabled()`（既有字段默认值未动） |
| `tests/parse/token-time-shapes.mjs` | + `--incremental` / `--mode` / `--quiet` / `--legacy-corpus` / `--write-baseline`；char11 期望侧注解容错；JSON `mode`；语料指纹采集/比对 |
| `tests/parse/token-time-shapes/README.md` | 14 步口径、新选项、语料基线文件、注解容错口径、561 产物 |

**新增（3）**

| 文件 | 说明 |
| --- | --- |
| `typescript/tokens/expressions/expression-catalog-factory.xl.md` | `ExpressionCatalogFactory.Create(): Array<PossibleShape>` stub（返回 `[]`）+ 契约注释；之后归 WP-C |
| `tests/parse/token-time-shapes/legacy-corpus-baseline.json` | legacy 语料 XML 指纹基线（1723 文件，确定性产物，无时间戳） |
| `_coord/CONTRACT-tts-incremental.md` | 契约 C1–C11 + 接口签名 + 验收配方 |

**未改**：`typescript/tokens/names/identifier-shape.xl.md`（已有 `FromBasicToken`，只校验，见 §1.3/§6）、
`typescript/IMPORTANCE.md`、`core/**`、`cjcli.xl.md`、既有 gates、canonical 主仓库。

---

## 3. 构建读数

| 步骤 | 读数 |
| --- | --- |
| `xl_build`（`cwd=<克隆>`、`paths=["core","typescript"]`、`targets=["ts"]`、未传 `out`）**首次** | **561 written** / 0 skipped / 0 error / **3 warning**（均为既有 `E1107`：`GetAccessorPossibleShape`、`IndexSignaturePossibleShape`、`SetAccessorPossibleShape`） |
| `xl_build` 二次（幂等复核） | **0 written / 561 skipped / 0 error / 3 warning** |
| `node node_modules/typescript/bin/tsc -p .` | **exit 0**（无输出，约 5s） |

> 561 = 560 基线 + 1 新增文件（`expression-catalog-factory.xl.md`）。任务书里的 560 是新增文件之前的基线数。

---

## 4. 目标用例读数（两种模式）

均针对 `tests/parse/token-time-shapes/let-x.ts`，**14 步 = 13 char + EOF**（口径更正，非 15 步）：

| 命令 | 结果 | 退出码 | stderr |
| --- | --- | --- | --- |
| `npm run tts`（= `--diff`，legacy 默认） | `合计: PASS 6 / FAIL 8 / 14 步` | **1** | 空 |
| `--diff --incremental` | `合计: PASS 6 / FAIL 8 / 14 步` | **1** | **空**（无异常） |
| `--diff --mode incremental` | 同上（等价写法） | 1 | 空 |
| `--diff --quiet` | 一行：`token-time-shapes: PASS 6 / FAIL 8 / 14 步（模式 legacy）` | 1 | 空 |

- 与重构前（`5ced7ace`）基线**完全一致**：char 0–4 + EOF PASS，char 5–12 FAIL；开关已存在但还没有形状接它 ⇒ 两模式同读数，属预期。
- 头部实测：`模式: incremental（EnableIncrementalVariableShapes = true）`；
  `--json` 实测：`{"mode":"incremental","field":"EnableIncrementalVariableShapes","applied":true,...}`。
- `TTS_MODE_FIELD=NoSuchField` 实测：stderr 只有一行 `[token-time-shapes] statement-route-util.js 里没有静态字段 NoSuchField；本趟按 legacy 模式跑。`，照常 6/8/14、退出码 1（不报环境错误）。

### char 11 注解容错实测

- 现状：char 11 仍 **FAIL**（首个差异在第 2 行 —— 是结构差异，不是那行 `← 3 关闭即封口` 注解），所以基线仍是 6/8/14。
- 合成验证（临时把 char 0 的一行加上 `   ← 合成注解` 后 `--expected` 指向副本，未改文档/期望文件）：
  `[PASS] char 0  "l"  [annotation-only]` + `合计: … （其中 1 步仅差文档内嵌注释，计 PASS）` ⇒ 容错已生效。

---

## 5. legacy 语料基线（默认模式零回归证据，供 WP-E）

- 采集：`node tests/parse/token-time-shapes.mjs --legacy-corpus --write-baseline`
  → **1723 文件**（`tests/cases/token` 1719 `.ts` + **4 `.tsx`**；`samples/*.ts` 3 个并入），
  **解析异常 7 个**（也进基线，指纹含确定性的错误文案），耗时 **1.2s**，写入 `legacy-corpus-baseline.json`（约 246 KB）。
- 比对（两次独立进程）：
  - `--legacy-corpus`（非 quiet）→ `文件数: 当前 1723 / 基线 1723`、`一致: 1723`、**`差异: 0（变化 0 / 缺失 0 / 新增 0）`**、**exit 0**；
  - `--legacy-corpus --quiet` → `legacy-corpus: 当前 1723 文件 / 基线 1723 文件，差异 0（…，模式 legacy）`、**exit 0**；
  - `--legacy-corpus --incremental` → 同样 **0 差异**（语料模式固定 legacy，输出写明）。
- 7 个解析异常文件：`samples/generic.ts`、`lex-jsx-expression-attribute.tsx`、`lex-jsx-self-closing.tsx`、
  `lex-preprocessor-if.ts`、`lex-string-dollar-prefix-intact.ts`、`gap-r1244-ctor-signature-generic-return-type.ts`、
  `type-fn-return-typeliteral.ts`（均为既有解析缺口，基线只记录不改行为）。
- 基线确定性：无时间戳；重跑 `--write-baseline` 应逐字节相同（两次比对 0 差异已间接验证）。

---

## 6. 给 WP-B / WP-C 的接口签名（已落地、可直接调用）

```ts
// 1) 增量开关（WP-B 分流用）
StatementRouteUtil.EnableIncrementalVariableShapes: bool = false   // 静态字段，只写它
StatementRouteUtil.IsIncrementalVariableShapesEnabled(): bool      // 静态方法，只读它

// 2) 表达式候选目录（WP-C 填充；WP-B 挂载）
ExpressionCatalogFactory.Create(): Array<PossibleShape>            // 现在返回 []，每次调用新实例
// WP-B 用法：new CatalogGuide(ExpressionCatalogFactory.Create(), endPossible)

// 3) Identifier 工厂（已存在，未改动；Pos 由调用方赋）
IdentifierShape.FromBasicToken(token: Common, context: SyntaxContext): IdentifierShape
// 用法：
const identifier = IdentifierShape.FromBasicToken(unit as Common, context);
identifier.Pos = pos;   // pos = 前一个非 trivia 单元的 SourceRange.EndIndex（C1：let 的 EndIndex = 3）
```

C1 的 `Pos` / `src` 模板：`VariableStatementShape` pos=0；`VariableDeclarationListShape` pos=0；
`VariableDeclarationShape` pos=3 / src 从 4；`IdentifierShape` pos=3 / src=`[4,5)`（src 由 token 取、pos 手动赋）。

---

## 7. 偏离契约 / 与任务书不同之处（均已在 CONTRACT 记录）

1. **`xl_build` 是 561 written 而不是 560**：新增 `expression-catalog-factory.xl.md` 必然多一个产物文件
   （560 基线 + 1）。0 error / 3 个既有 `E1107` warning 与任务书一致。
2. **`IdentifierShape.FromBasicToken(token, pos)` 未新增**：该静态工厂**已存在**（签名 `(token: Common, context: SyntaxContext)`，
   全仓 100+ 处调用），任务书的「若没有才补」条件不成立；xl 同类不支持同名重载，改签名会波及默认路径。
   因此选择「校验 + 文档化」，`Pos` 由调用方按仓库既有惯例赋（`direct-declaration-assembly.xl.md:71-82`）。
3. **语料基线含 4 个 `.tsx`**：任务书写「所有 `.ts`」，但 `tests/cases/token` 下确有 4 个 `.tsx` 用例，
   一并纳入更完整（解析入口同为整文档 `context.Process`）。
4. **语料模式固定 legacy**：`--legacy-corpus` 同时给 `--incremental` 时强制按 legacy 采集/比对（输出写明），
   因为基线用途就是默认模式零回归；如需增量模式语料对照，另起 WP-E 的基线文件。
5. **`--write-baseline` 单独使用隐含语料模式**（默认 `tests/cases/token`），便于命令更短。
6. **char 11 基线仍 FAIL**：注解容错只作用于「去注解后完全相等」的行；当前 char 11 是结构差异，故不影响 6/8/14。
7. 任务书要求的 `_coord/CONTRACT-tts-incremental.md` 中的 C1–C11 为 Lead 决策，WP-A 逐条照抄并补「实现要点」，
   未改任何一条口径；`_coord/REPORT-tts-plan.md` / `REPORT-tts-harness.md` 里仍写「15 步」的旧文未动（非 WP-A 文件），
   以 CONTRACT 的 14 步口径为准。

---

## 8. HANDOFF

**无 HANDOFF。** WP-A 范围内全部完成：

- 开关 + 工厂 stub + Identifier 校验 + 工具扩展 + 契约/报告/README 已提交；
- legacy 与 incremental 两模式均复现 `PASS 6 / FAIL 8 / 14`（exit 1），默认行为零变化；
- 语料基线 1723 文件、0 差异（两次独立进程）；
- 构建 561 written / tsc exit 0 / git 工作区干净（`dist`、`build` 已被 `.gitignore` 忽略）。

**下一棒**：
- **WP-B** 用 `IsIncrementalVariableShapesEnabled()` 在 `VariableStatementPossibleShape.ComputeByIndex` 分流，
  按 C1 建三层 `Pos`/`src`，`IdentifierShape.FromBasicToken` + `Pos` 造绑定名，遇到未支持形态按 C10 显式抛错；
- **WP-C** 在 `ExpressionCatalogFactory.Create()` 填候选并按 C3 完成二元表达式右边界封口（char 8 起）；
- 任何包改完 `.xl.md` 后：`xl_build` → `tsc -p .` → `npm run tts`（legacy 必须仍 6/8/14）→
  `--diff --incremental` → `--legacy-corpus`（必须 0 差异）。
