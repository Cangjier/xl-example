# M-B4f 合并报告：B4f 箭头默认值与嵌套箭头括号

- 合并者：M-B4f（合并智能体）
- 日期：2026-10-27
- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，分支 `feature/all-possible`
- 基线 `$BASE`：`4de5202a`（合并前 HEAD，工作树干净）
- 来源：`xl-example-set\b4f-arrow-edge`，分支 `feature/b4f-arrow-edge` @ `baaf961c`（base = `4de5202a`）
- 合并方式：`git merge --no-ff refs/merge/b4f`
- 合并提交：`d6402961`（父 = `4de5202a` + `baaf961c`）
- 性质：**默认档行为**。箭头参数允许 `= default`，嵌套箭头内层括号改走 Deferred 重放；未开任何新开关。

## 1 取回与预检

| 步骤 | 命令 | 读数 |
| --- | --- | --- |
| 干净确认 | `git status --short` | 空；HEAD `4de5202a` |
| 取回 | `git fetch --no-tags <b4f-arrow-edge> "feature/b4f-arrow-edge:refs/merge/b4f"` | `refs/merge/b4f` = `baaf961c` |
| 三点 diff | `git diff --stat 4de5202a...refs/merge/b4f` | 6 文件，+859 / −17 |

改动面：

| 文件 | 变更 |
| --- | --- |
| `typescript/tokens/types/parameter-list-possible-shape.xl.md` | **改**：`IsSimpleArrowList` 允许 `= default`，仅接受箭头（+241 行） |
| `typescript/tokens/types/forms/primary/arrow-params-catalog.xl.md` | **改**：`CanBuildDefaults`、`IsArrowBodyPrefix`、`PreviousParamPos`、nested rule |
| `typescript/tokens/statements/bracket-role-resolver.xl.md` | **新增**：括号角色判定（嵌套箭头内层 paren 走 Deferred） |
| `typescript/cases/tts/tools/arrow-edge-probe.mjs` | **新增**：探针 15 例 |
| `typescript/cases/tts/tools/arrow-param-probe.mjs` | **改**：适配默认值参数 |
| `_reports/B4f.md` | **新增**：分支自带说明 |

## 2 合并

`git merge --no-ff refs/merge/b4f -m "merge(b4f): arrow default-value params + nested arrow parens"`

- 策略 `ort`，**0 冲突**，未触发「≤3 手工保双侧」路径，未手工编辑任何源码。

## 3 重建

| 步骤 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| 生成 | `xl_build { cwd: repo, paths: ["core","typescript"], targets: ["ts"] }` | **3 written / 631 skipped / 0 error / 3 warning**（3 条均为既有 `E1107` 别名重复） | PASS |
| 类型 | `node node_modules/typescript/bin/tsc -p .` | **exit 0** | PASS |

写入的 3 件正是本分支改动的三份 `.xl.md`：`parameter-list-possible-shape`、`bracket-role-resolver`、`arrow-params-catalog`。

## 4 验收读数

| 项 | 命令 | 读数 | 判定 |
| --- | --- | --- | --- |
| gates（默认档 incremental） | `node tests/gates/run.mjs` | **4 通过 / 0 失败 / 7 不适用** | PASS |
| gates（对照档 legacy） | `node tests/gates/run.mjs --legacy` | **4 通过 / 0 失败 / 7 不适用** | PASS |
| wide-ast（默认） | `node tests/parse/wide-ast.mjs` | 崩溃 **0/0**、差异 **29/33**、fallback **83+13=96/85**、缺 range 0、越界 0、distOnlyKinds 0、policyProblems 0 | **PASS** |
| wide-ast（`--legacy`） | `node tests/parse/wide-ast.mjs --legacy` | **0/0/2+0=2**（白名单外部 13 件本档不命中） | **PASS** |
| real-dts | `node typescript/cases/real-dts-ast.mjs` | 226 文件解析成功 226、崩溃 0/0、差异 **0/33**、缺 range 0 | **PASS** |
| tts（产品路径） | `node typescript/cases/tts/run.mjs` | **PASS 429 / FAIL 0 / 429**（throw 3/3、atomic 0/0、partial 0/0、incremental 426/426） | PASS |
| tts 静默档 | `node typescript/cases/tts/run.mjs --quiet` | 无输出、exit 0 | PASS |
| tshape-judge | `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | **total 429 / ok 426 / failures 3**（既有三条：`class-ball` / `expression-zoo` / `generic-container`） | PASS（与基线同） |
| 探针 | `node typescript/cases/tts/tools/arrow-edge-probe.mjs` | **15 例 OK / 0 例异常**，尾行 `ARROW-EDGE-PROBE PASS` | PASS |

读数与预期逐条对齐：gates `4/0/7`（默认与 `--legacy` 均是）、`wide-ast` 默认 `0/29/96`、`--legacy` `0/0/2`、`real-dts` PASS、`tts` `429`、`ts-all` `426/0/3`、探针 15 PASS。

### 探针关键例

- `arrow-body-paren`（`let r = x => (a) + 1;`）：`Deferred/ArrowParams/nested-arrow-paren-wait-for-arrow`，`pending=1`、`replay+0`，参数 `IdentifierShape`。
- `arrow-body-paren2`（`let s = (a) => (b) + 1;`）：`replay+1 (expected 1)`，`bindReplayCounts=[8:1,8:1]`，`deferred+2` —— 嵌套箭头内层括号重放生效。
- `function-params` / `call-args`：`replay+0`，角色分别落在 `Known/ParameterList` 与 `Known/CallArgs`，默认值参数未污染普通形参表。

### 已知残项

- `x => (b) => b` 仍为 **0**（与基线相同），属登记在案的残项，不构成回滚理由；未执行 `git reset --hard $BASE`。

## 5 约束遵守

- 未 push、未 pull origin；未建新分支。
- 未重生成 INDEX / README。
- 未改源码（冲突为 0，无手工编辑）。

## 6 清理

- 先解掉 `b4f-arrow-edge\node_modules`（指向主仓库 `node_modules` 的 junction），再删整个来源目录：`xl-example-set\b4f-arrow-edge` 已移除。
- `git update-ref -d refs/merge/b4f`：临时合并引用不留痕（`git for-each-ref refs/merge` 为空）。
- 主仓库工作树内 `git status --short` 为空（本报告提交后）。

## 7 结果

- 合并提交 `d6402961` 落在 `feature/all-possible` 上；默认档读数与清单预期完全一致，无回归、无回滚。
- 箭头默认值参数与嵌套箭头内层括号重放进入主线，普通形参表 / 调用实参两族读数不变。
