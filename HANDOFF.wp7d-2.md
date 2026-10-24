# HANDOFF — impl-wp7d-2（WP-7 D-2 第二波：legacy/shadow 删除 + 剩余改名 + 收口）

STATUS: **COMPLETE** —— 阶段 B / C / D 全部完成并绿（本文件另起一个 commit）。
BRANCH: `impl-wp7d-2`（base `impl-wp7d-1 @ ec66679e`）
PATH: `C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp7d-2`
未 merge、未 push。

## 0. 起点重建验证（ec66679e，未做任何改动）
`xl_build(force)` 512 written / 0 error / 1275 warning → tsc exit 0 → AST **6167/6167、0/0/0**。
与 wp7d-1 §2 完全一致，起点可信。

## 1. 阶段 B（legacy / BatchMode 清理，commit `1bfdf479`）

### 1.1 删除的文件（2）
- `core/syntax/batch/legacy-batch-adapter.xl.md`
- `core/syntax/batch/shadow-compare.xl.md`

### 1.2 删除的代码/契约
| 位置 | 删除内容 |
|---|---|
| `core/syntax/token.xl.md` | `OnBasicTokenClosed` 的 legacy 兜底（`if ("ComputeItems" in this) { … ComputeItems … }`）→ 只剩 `return CloseStates.Nothing;`；连带的 `IItemCompute` / `ItemComputeStates` import 一并裁掉 |
| `core/syntax/syntax-context.xl.md` | `field BatchMode:int = 1` 整节、`field Shadow:ShadowCompare \| null = null` 整节、`ShadowCompare` import |
| `core/syntax/i-item-compute.xl.md` | `property CatalogGuide` 整节 + 其叙述行 + `CatalogGuide` import（legacy 契约；宿主侧字段保留到 C 改名） |
| `core/syntax/unit-token.xl.md` | `OnBasicTokenClosed` 的 `context.BatchMode === 0 \|\|` 条件；`LegacyBatchAdapter` / `BatchMode=0` 三处叙述 |
| `typescript/run/statement-block-stream.xl.md` | `if (context.BatchMode === 0 \|\| !…Enabled)` → `if (!…Enabled)`；第 1 条顺序说明 |
| `typescript/tokens/statements/statement-builder.xl.md` | `else if (this.Context.BatchMode !== 0)` → `else`；`if (this.Context.BatchMode !== 0 && !unit.IsBasicToken …)` → 去掉前半条件；case-clause 的 `if (BatchMode !== 0) { … }` 拆掉外壳（**注意：拆外壳要连同块尾 `}` 一起删，否则 xl_build 仍报 0 error 但 tsc 会红——本波实际踩到，见 §5**）；4 处叙述 |
| `core/syntax/batch/i-batch-host.xl.md` | “二选一（ItemListEngine / LegacyBatchAdapter）”叙述 → 只装 `ItemListEngine` |
| 5 个 basic token | “父单元是不是宿主由它自己的 `CatalogGuide` 说了算” → `BatchAdapter` |

`BatchMode` 字段**整个删掉**（不是保留 1）：所有分支删完后它已无引用，叙述也再无意义。

### 1.3 关键判据：legacy 删除后 AST 是否仍 6167
**是。** 删完 legacy 后重建：`xl_build(force)` 510 written / **0 error** → tsc exit 0 →
AST **6167/6167、0 结构差 / 0 位置差 / 0 字段差**。说明没有任何壳还依赖 legacy 路径：
唯一实现是 `ItemListEngine`（各体宿主 `*BodyItemHost` 都是 `new ItemListEngine(rules)`），
`Token.OnBasicTokenClosed` 默认实现在删掉后不会被任何真实宿主命中。

## 2. 阶段 C（剩余改名，与 B 同 commit `1bfdf479`）

### 2.1 5 个 `*-possible-shape` → 普通 `*Rule`（文件改名 + 类改名，判据体一字未动）
| 旧文件 / 旧类 | 新文件 / 新类 |
|---|---|
| `statement-possible-shape` / `StatementPossibleShape` | `statement-rule` / `StatementRule` |
| `expression-statement-possible-shape` / `ExpressionStatementPossibleShape` | `expression-statement-rule` / `ExpressionStatementRule` |
| `class-keyword-possible-shape` / `ClassKeywordPossibleShape` | `class-keyword-rule` / `ClassKeywordRule` |
| `class-expression-possible-shape` / `ClassExpressionPossibleShape` | `class-expression-rule` / `ClassExpressionRule` |
| `jsdoc-class-tag-possible-shape` / `JSDocClassTagPossibleShape` | `jsdoc-class-tag-rule` / `JSDocClassTagRule` |

全部仍 `extends ShapeRule`，只改名。`git ls-files '*possible*.xl.md'` = **0**。

### 2.2 `CatalogGuide` → `ShapeCatalog`（35 文件 → 0）
- 类名/字段名/import 符号全量改名（29 文件命中）；文件
  `core/syntax/catalog-guide.xl.md` → `core/syntax/shape-catalog.xl.md`（9 个 import 路径同步）。
- 字段名早在阶段 A 已是 `Shapes` / `SlotCache`，本波不再动。
- `tests/bench/{dts-cost-probe,dts-micro-buffer,slot-micro}.mjs` 的 require 路径同步到
  `shape-catalog.js` / `shape-rule.js`。

### 2.3 与任务书的偏差（1 处，已评估）
**`UnitToken.CatalogGuide` 字段没有删除，而是改名为 `ShapeCatalog`。**
原因：`typescript/tokens/declarations/body-guide-util.xl.md` 仍在写
`bracket.CatalogGuide = new CatalogGuide(shapes)`（`UnitToken` 的字段），删字段会直接打断编译；
而 `body-guide-util` 的删除属于 WP-7 E（TEAM §5.4-2 记的“C/D 组删除”在本分支并未发生）。
由于 `CatalogGuide` 这个名字必须消失（grep 目标），改名与删除在判据上等价，且改名是行为保持的。
`IItemCompute.property CatalogGuide`（legacy 契约本体）**已删除**。

## 3. 阶段 D（收口）
| 步骤 | 结果 |
|---|---|
| `xl_orphans(prune)` | 8 个残留产物清除（2 个 legacy + 2 个改名 + 4 个 possible-shape 旧产品） |
| `xl_build(force)` | **510 written / 0 skipped / 0 planned / 0 error / 1274 warning** |
| tsc | exit 0（3.2–3.5 s） |
| AST 子集 | 1214/1214；0/0/0 |
| **AST 全量** | **6167/6167；结构 0 / 位置 0 / 字段 0** |
| **real-dts** | **226 文件：解析成功 226、崩溃 0、AST 一致 226** |
| item-oracle | 454 前缀全一致 PASS |
| batch-split | 70 段 / 837 断言 / 0 失败 PASS |
| stream-proof | PASS 146 / FAIL 0 |
| `gates.ps1 -Tier standard` | **RESULT: PASS**（12.3 s；tests/gates 1/8 基线已知红） |
| `gates.ps1 -Tier full -BaseBuild …\baseline-build\build` | **RESULT: PASS**（45.5 s） |
| full 的 WAIVED 读数 | buffer xml PASS 4488 / FAIL 16 / ERROR 52、digest PASS 4384 / FAIL 120 / ERROR 52；statement-scaling 同规模 1.13–1.41 > 1.10；class-scaling --base XML 21/21，same-line base=throw/new=null |
| xl_check | **510 files / 0 error / 1274 warning** |
| xl 文件数 | **511**（起始 513 − 删 2；改名不改变数量） |

### 目标 grep（`-- '*.xl.md'`）
`PossibleShape` = 0、`ComputePossibleShapes` = 0、`CatalogGuide` = 0、
`LegacyBatchAdapter` = 0、`ShadowCompare` = 0 → **全部 0**。

## 4. 未完成 / 下一步
1. **xl 文件数 511，不是任务书预期的 ~490。** 差 21 个来自“改名不减少文件数”：
   B 只删了 2 个 legacy 文件，5 个 possible 是改名而非删除。要降到 ~490 需再删
   `body-guide-util.xl.md` 一类 WP-7 E 退役文件（TEAM §5.4-2 已记 body-guide 退役）。
2. **`body-guide-util.xl.md` 仍在**，且仍给括号挂 `ShapeCatalog`；它一删，`UnitToken.ShapeCatalog`
   字段就可以真正删掉（本波的偏差即可收口）。注意 `tests/body-guide/` 也已退役但目录还在。
3. 纯文本瑕疵：`source-file-shape.xl.md` / `body-guide-util.xl.md` 注释里还有
   `XxxStatementShapeRule` / `SourceFileEndShapeRule` 这类由 `XxxPossibleShape` 机械替换来的历史名
   （只在注释里，不影响编译与门禁），收口时可读性重写。
4. `root-rule-contract.xl.md` 里“缓存类型暂时仍是 `ItemSlotCache`”的历史叙述（wp7d-1 §5.7 记的）未动。

## 5. 本波踩到的坑（接任者必看）
1. **`RD` 是内置别名**：`function RD($rel)` 会被 PowerShell 解析成 `Remove-Item`（别名优先于函数），
   结果“读文件”变成了**删文件**。读文件函数别取 `RD`/`rm`/`del` 这类名字（本波改用 `GetTxt`/`SetTxt`）。
2. **`[IO.File]::ReadAllText` 的相对路径用的是进程当前目录，不是 PowerShell 的 `Set-Location`。**
   本波一开始在 `xl-example-set\impl-wp7d-2` 里 `Set-Location` 后用相对路径读，
   实际读到的是会话工作目录 `xl-example` 的文件（行号对不上、内容像但不是）。
   → 脚本里一律 `[Environment]::CurrentDirectory=$R` + 绝对路径，或直接用 `Join-Path $R`。
3. **`\b` 在 CJK 相邻处不成立**：`PossibleShape形状` 的 `\b` 不匹配（汉字也是 word 字符）。
   纯 ASCII 标识符改名用 `PossibleShape(?!s)` 而不是 `\bPossibleShape\b`。
4. **长名优先**：`ExpressionStatementPossibleShape` / `statement-possible-shape.xl.md` 必须排在
   `StatementPossibleShape` / `statement-possible-shape.xl.md` **之前**，否则被截成残废名。
5. **大小写**：文件叫 `jsdoc-class-tag-*`，类却叫 `JSDocClassTagPossibleShape`（大写 D）。
   按小写名改会得到“0 files”，静默漏改。
6. **拆 `if (...) {` 外壳必须连块尾 `}` 一起删**：`xl_build` 对这种语法级错误仍报 **0 error**
   （它只做 xl→ts 的字面生成），错误只在 `tsc` 暴露。→ **每次 xl_build 之后必须跑 tsc**，
   别信 build 的 0 error。
7. 任务书 `-BaseBuild` 的现值是 `set\baseline-build\build`（不是 `set\baseline-build`）；
   传目录本身 `gates.ps1` 也能跑，但 `buffer-equivalence` 会拿错路径。