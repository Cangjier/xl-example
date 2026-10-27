# M-R19 路 合并 `feature/r19-value-object`（值位 `{` → `ObjectLiteralExpression` 候选）

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible`
- 基线：`3fce1790`（`$BASE`，合并前 HEAD，工作树干净）
- 合入：`67241167`（`feature/r19-value-object`，base = `ed9399a0`），经
  `git fetch --no-tags <set>\r19-value-object "feature/r19-value-object:refs/merge/r19"`
- 方式：`git merge --no-ff refs/merge/r19`，**无冲突**（0 处，5 文件 +472/−10，未做任何手工改源码）
- 合并提交：**`254dd81f`** `merge(r19): value-position object literal operand`
- 未 push、未建新分支、未重生成 INDEX/README、未 `Start-Sleep`

## 1. 三点 diff 预检

`git merge-base HEAD refs/merge/r19` = `ed9399a0`（= 声明的 base）→ 非快进，按要求走 `--no-ff`。
改动 5 件，与任务书逐条对上：

| 文件 | 性质 |
|---|---|
| `typescript/tokens/expressions/forms/shared/object-literal-operand.xl.md` | 新增（191 行） |
| `typescript/tokens/expressions/right-operand-possible-shape.xl.md` | 改（接线 + `IsOperatorLike` 拼写） |
| `typescript/tokens/expressions/forms/operator/conditional-possible-shape.xl.md` | 改（接线） |
| `typescript/tokens/expressions/forms/prefix/prefix-unary-possible-shape.xl.md` | 改（接线） |
| `_reports/R19.md` | 新增（报告） |

`core/**`、`tests/**`、门/基线/天花板/`EXPECTED` 均未动。

## 2. 构建

| 项 | 读数 |
|---|---|
| `xl_build`（cwd=repo，ts） | 4 written / 633 skipped / **0 error** / 3 warning |
| `tsc -p .` | **exit 0** |

3 条 warning 全是既存 `E1107`（`class-get-accessor-possible-shape` / `class-index-signature-possible-shape`
/ `class-set-accessor-possible-shape` 各重复声明一型），与基线同身位，未增益。

## 3. 验收（两档并列）

| 项 | 预期 | 实测（default） | 实测（`--legacy`） |
|---|---|---|---|
| `tests/gates/run.mjs` | 4/0/7 | **4 通过 / 0 失败 / 7 N/A** exit 0 | **4 / 0 / 7** exit 0 |
| `tests/parse/wide-ast.mjs` | 0/2/73（legacy 0/0/2） | **崩溃 0 / 差异 1 / fallback 73**（外部 13、`policyProblems 0`）**PASS** | **0 / 0 / 2** PASS |
| `real-dts-ast` | PASS | **PASS**（226 文件、崩溃 0/0、差异 0/33） | PASS |
| `typescript/cases/tts/run.mjs --quiet` | PASS 429 | **PASS 429 / FAIL 0**（exit 0） | — |
| `tshape-judge ts-all` | 426/0/3 | **total 429 / ok 426 / failures 3** | — |

default wide-ast 只剩 **1** 条 DIFF：`tests/cases/token/expressions/ex-await-yield.ts`（structural 12）。
比预期 2 条**还少一条**──`expr-generic-inst-statement` 在 R16 已消失，而 `expr-ternary-object-branches`
（`a ? {…} : {…}`，三目两支都是对象）这趟随 `ConditionalMemberPossibleShape` 的改动一并转绿，
**没有出现任何新文件名**。`ts-all` 的 3 条失败仍是基线那 3 条
`throw/composite/{class-ball,expression-zoo,generic-container}.ts`（`incremental-error`，声明符号
`?.` / `??` / `<` 的形状未支持），与基线逐字同身位。

## 4. 目标用例

| 用例 | 结果 |
|---|---|
| `tshape-judge ts tests/cases/token/statements/stmt-r1236-value-word-brace.ts` | **`status: ok`**（structural `[]` / moved `[]` / fields `[]`） |
| 该文件 wide-ast（`--only`） | **`FileFallbackCount 0`**、structural 0、差异 0 |

基线里它是 `incremental-error` step 1145 + `structural=6` + `FileFallbackCount=1`。

## 5. 「0 条原来通过现在失败」

- 两档崩溃恒为 0/0；`ts-all` ok 恒 426、`tts` PASS 恒 429；legacy 恒 0/0/2；两档 gates 恒 4/0/7。
- default wide-ast：崩溃 0 不变、差异 **2→1**（只减不增）、fallback **75→73**
  （`FileFallbackByFamily tests/cases/token=72`、`samples/declarations.ts=1`），离天花板 85 更远。
- **未触发 `git reset --hard $BASE`，无净损失。**

## 6. 清理

- `xl-example-set\r19-value-object`：该目录内 `node_modules` 若为指向主仓库的 junction，先 `rmdir` 解链
  （不跟进目标）再整树删除；删前/删后复核主仓库 `node_modules` 仍在。
- ref：`refs/merge/r19` 已 `update-ref -d`（`refs/merge/` 现为空）。
- 分支：`feature/r19-value-object` 只存在于 set 侧副本，随目录一并移除；主仓库无同名分支。
- 最终 `git status --short` **为空**。

## 7. 最终 HEAD

- 合并提交：`254dd81f`；本报告以紧随其后的独立提交落盘（`--oneline` 顶部即最终 HEAD）。
