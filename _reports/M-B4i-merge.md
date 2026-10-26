# M-B4i · 合并 `feature/b4i-container-owner`（容器形状归属 K1）

| 项 | 值 |
| --- | --- |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible` |
| 基线 `$BASE` | `c627e97e90334b895ece5a311b16bc60ac08eb7f`（干净，无未跟踪改动） |
| 待合并 | `xl-example-set\b4i-container-owner` · `feature/b4i-container-owner` @ `f2cccf95da537d152d359bf1495c3a74cf40d96f` |
| 三点 diff | 7 文件 +476/−34：6 个 `.xl.md`（+317/−34）与 `_reports/B4i.md`（+159） |
| 合并方式 | `git merge --no-ff refs/merge/b4i -m "merge(b4i): container shape ownership (K1)"`，`ort` 策略，**0 冲突** |
| 最终 HEAD | `e783df92f4978a811f4c594ed420a0d9ca9e939a` |
| 推送 | 无（未 push / 未 pull origin）；未建新分支；未改源码 |

## 改动内容（来自 B4i）

- `EnableContainerShape=true` 新默认，开关关闭时与 base 逐位相同（`StatementRouteUtil.EnableContainerShape`）。
- 消费容器五处 + 六类位置闸的 `Refused` 计数（`container-shape-catalog` / `statement-route-util` / `source-file-shape` / 变量声明两端 / 表达式语句可能形状）。
- `TypeScriptRegexTemplate.CanStartAt` / `CanEndExpression` / `FinishIncremental` 整段 ParseExpression + 覆盖校验、`HasContainerInitializer`。
- 新增 `declarations/variable-declaration-shape.xl.md` 等；探针 `typescript/cases/tts/tools/container-shape-probe.mjs`。

## 验收读数（合并后实测）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `xl_build {core,typescript} → ts` | **0 error / 3 warning**（3 条均既有 `E1107`）；6 written / 628 skipped |
| 类型检查 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |
| gates 默认档 | `node tests/gates/run.mjs` | **4 通过 / 0 失败 / 7 不适用** |
| gates `--legacy` | `node tests/gates/run.mjs --legacy` | **4 / 0 / 7** |
| `wide-ast` 默认 | `node tests/parse/wide-ast.mjs` | **PASS 0 / 29 / 82+13=95**（差异 29/33、fallback 95/85） |
| `wide-ast --legacy` | `node tests/parse/wide-ast.mjs --legacy` | **PASS 0 / 0 / 2** |
| `real-dts` | `node typescript/cases/real-dts-ast.mjs` | **PASS**：226 文件、崩溃 0/0、差异 0/33 |
| `tts` | `node typescript/cases/tts/run.mjs --quiet`（及非 quiet 复核） | **PASS 429 / FAIL 0**（exit 0；throw 3 / incremental 426） |
| `ts-all` | `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **429 / 426 ok / 3 err** |
| 容器探针 | `node typescript/cases/tts/tools/container-shape-probe.mjs` | **PASS**（`BuildCount=1 AlreadyConsumed=5 Refused=0 RouteCount=1`） |
| 开关运行时 | `require build/.../statement-route-util.js` | **`EnableContainerShape = true`** |

`expr-division-after-comment` 的 4→5 为已知基准差异（fallback 计数口径），本次未引入新 fallback：`FileFallbackCount 82+13` 与 `--legacy 2` 与登记读数一致。

INDEX/README 未重生成（读数未变）。

## 清理

- `refs/merge/b4i` 已 `update-ref -d` 删除。
- `xl-example-set\b4i-container-owner`：先解 `node_modules` junction（用 `rmdir` 删链接，不触碰主仓库 `node_modules`），再删整个工作副本目录。
- 主仓库 `git status --short` 为空（仅本报告与 `_reports/B4i.md` 已提交）。
