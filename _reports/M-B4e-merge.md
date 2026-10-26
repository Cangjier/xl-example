# M-B4e 合并报告：B4e 容器关闭钩子基建（默认关闭）

- 合并者：M-B4e（合并智能体）
- 日期：2026-10-27
- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 基线 `$BASE`：`d97cd42b`（合并前 HEAD，工作树干净）
- 来源：`xl-example-set\b4e-container`，分支 `feature/b4e-container` @ `ae0769a5`（base = `d97cd42b`）
- 合并方式：`git merge --no-ff refs/merge/b4e`
- 性质：**零行为基建**。容器形状（container shape）与关闭钩子的接线全部挂在默认关闭的开关后面。

## 1 取回与预检

```text
git fetch --no-tags <b4e-container> "feature/b4e-container:refs/merge/b4e"   -> refs/merge/b4e = ae0769a5
git diff --name-status d97cd42b...ae0769a5                                  -> 10 文件（3 新增 / 7 修改），+892 / -4
git merge-tree --write-tree --messages refs/merge/b4e d97cd42b              -> 单树，无冲突段
```

改动面：

| 文件 | 变更 |
| --- | --- |
| `core/syntax/basic-tokens/bracket.xl.md` | **改**：`BracketClosedHook`（close 完成后调用，默认 `null`） |
| `typescript/tokens/expressions/forms/shared/container-shape-catalog.xl.md` | **新增**：`ContainerShapeCatalog`（四族容器格 + `CloseHook`），394 行 |
| `typescript/tokens/statements/statement-route-util.xl.md` | **改**：`EnableContainerShape = false` |
| `expression-builder` / `expression-atom-registry` / `source-file-shape` / `variable-declaration-shape` / `type-catalog-factory` | **改**：挂接点（全部在开关内） |
| `typescript/cases/tts/tools/container-shape-probe.mjs` | **新增**：探针（运行期自己把开关翻 `true`，读四族槽位并与 TS AST 对拍） |
| `_reports/B4e.md` | **新增**：分支自带说明 |

## 2 合并

`git merge --no-ff refs/merge/b4e -m "merge(b4e): container close hook infrastructure (default off)"`

- 策略 `ort`，**0 冲突**，未触发「≤3 手工保双侧」路径，源码未做任何手工编辑。
- 合并提交：`e1dad8a3`（父 = `d97cd42b` + `ae0769a5`）。

## 3 重建

| 步骤 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| 生成 | `xl_build { cwd: repo, paths: ["core","typescript"], targets: ["ts"] }` | **8 written / 626 skipped / 0 error / 3 warning**（3 条为既有 `E1107` 别名重复） | PASS |
| 类型 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** | PASS |

## 4 验收读数

| 项 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| gates（默认档 incremental） | `node tests/gates/run.mjs` | **4 通过 / 0 失败 / 7 不适用** | PASS |
| gates（对照档 legacy） | `node tests/gates/run.mjs --legacy` | **4 通过 / 0 失败 / 7 不适用** | PASS |
| wide-ast（默认） | 门内 | 崩溃 **0/0**、差异 **33/33**、fallback **83+13=96/85**、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | **PASS** |
| wide-ast（`--legacy`） | 门内 | **0/0/2+0=2**（天花板 2） | **PASS** |
| real-dts（默认） | 门内 | 崩溃 0/0、差异 **0/33**、缺 range 0 | **PASS** |
| real-dts（`--legacy`） | 门内 | 崩溃 0/0、差异 0/0、缺 range 0 | **PASS** |
| tshape-judge | `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 总 / 426 过 / 3 失败**（既有三条：`class-ball` / `expression-zoo` / `generic-container`） | PASS（与基线同） |
| 探针 | `node typescript/cases/tts/tools/container-shape-probe.mjs` | `BuildCount=1 AlreadyConsumed=5 Refused=0 RouteCount=1`、`ast: OK`、**PASS container-shape probe** | PASS |
| tts（增量档 = 产品默认路径） | `… --diff --incremental` on `let-x.ts` | **PASS 14 / FAIL 0 / 14 步** | PASS |
| tts（legacy 对照档） | `… --diff` | `PASS 6 / FAIL 8 / 14 步（模式 legacy）` | 对照档读数，非验收判据 |

读数与预期逐条对齐：gates `4/0/7`（默认与 `--legacy` 都是）、`wide-ast` 默认 `0/33/96`、`--legacy` `0/0/2`、`real-dts` PASS、`ts-all` `429/426/3`。

### 一条旁证观察（非验收项）

`node tests/parse/token-time-shapes.mjs --legacy-corpus --quiet` 读到 `当前 1723 文件 / 基线 1723 文件，差异 136（变化 136 / 缺失 0 / 新增 0，模式 legacy）`。

- 该基线不在本分支改动面内（10 个文件里没有它），最近一次重算在 `1d1fdc3a`（2026-10-26），而 `d97cd42b` 距它还有 **183** 个提交动过 `core/` 或 `typescript/`。
- 基线条目里能看到历史错误文本的编码混写（例如 `涓嶆敮鎸佺殑瀵硅薄绫诲瀷`），本机控制台是 GBK，`sha256` 对这类文本敏感。
- **本轮没有在 BASE 上做同一条命令的对拍**（`xl` 无 CLI，对拍要另建工作树重建 dist，超出本次预算），所以这 136 条差异既没有被判为迁移，也没有被判为回归。它不在本合并的验收清单里；建议下一位接手者在 `d97cd42b` 上跑一次同一条命令，读数相同即证与本次合并无关。

## 5 开关状态（本合并的关键约束）

- 字段：`typescript/tokens/statements/statement-route-util.xl.md:1300` → `## static field EnableContainerShape:bool = false`。
- 早退：`container-shape-catalog.xl.md:84`、`:295` 两处 `if (!StatementRouteUtil.EnableContainerShape) { … }`，默认档走既有路径。
- 因此读数落在默认档的 `33 / 96`，**开关 ON 的 `0/43/112` 没有出现**，也没有任何一处在合并中被翻成 `true`（探针只在运行期自己翻转，是分支自带的设计）。
- 未打开开关，未改源码。

## 6 清理

- 解掉 `xl-example-set\b4e-container\node_modules`（指向主仓库 `node_modules` 的 junction），再删除整个来源目录。
- `git update-ref -d refs/merge/b4e`：临时合并引用不留在仓库里（`git for-each-ref refs/merge` 为空）。
- 未 push / 未 pull origin / 未建新分支；未重生成 INDEX 与 README。

## 7 结果

- 合并提交 + 本报告提交后，`git status --short` 为空。
- 默认路径行为不变（零行为基建），容器形状能力完整躺在开关后面，等后续波次打开。
