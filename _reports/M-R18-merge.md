# M-R18 合并 `feature/r18-await`（裸 yield 尾的 ASI 收口 + 块体宿主挂载链卸载）

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible`
- 基线：`ea1f5950`（`$BASE`，合并前 HEAD，工作树干净）
- 合入：`34867b19`（`feature/r18-await`，base = `ed9399a0`），经
  `git fetch --no-tags <set>\r18-await "feature/r18-await:refs/merge/r18"`
- 方式：`git merge --no-ff refs/merge/r18`，**无冲突**（3 处，0 手工改源码）
- 合并提交：**`43ac7f7b`** `merge(r18): bare-yield ASI tail + unmount in block hosts`
- 未 push、未建新分支、未重生成 INDEX/README、未 `Start-Sleep`

## 1. 三点 diff 预检

`git merge-base $BASE refs/merge/r18` = `ed9399a0`（= 声明的 base）→ 非快进，按要求走 `--no-ff`。
改动 3 件，与任务书逐条对上：

| 文件 | 性质 |
|---|---|
| `typescript/tokens/declarations/forms/declaration-asi-boundary.xl.md` | 改：`IsBareYieldTail` 接进 `CanCloseAtLineBreak`（+65/−?） |
| `typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md` | 改：`CloseAtLineBreak` 去掉 `!(host instanceof Bracket)`，块体宿主同判据（`[R18:UNMOUNT]`） |
| `_reports/R18.md` | 新增（上游报告） |

`core/**`、`tests/**`、门/基线/天花板 `EXPECTED` 均未动。

## 2. 构建

| 项 | 读数 |
|---|---|
| `xl_build`（cwd=repo，core+typescript） | 2 written / 634 skipped / **0 error** / 3 warning |
| `tsc -p .` | **exit 0** |

3 条 warning 全是既存 `E1107`（`class-get-accessor-possible-shape` / `class-index-signature-possible-shape`
/ `class-set-accessor-possible-shape` 各重复声明一型），与基线同身位，未增。

## 3. 验收（两档并列）

| 项 | 预期 | 实测（default） | 实测（`--legacy`） |
|---|---|---|---|
| `tests/gates/run.mjs` | 4/0/7 | **4 通过 / 0 失败 / 7 N/A** exit 0 | **4 / 0 / 7** exit 0 |
| `tests/parse/wide-ast.mjs` | **0/0/73**（legacy 0/0/2） | **崩溃 0 / 差异 0 / fallback 73**（+外部 13，`policyProblems 0`）**PASS** | **0 / 0 / 2** PASS |
| `real-dts-ast` | PASS | **PASS**（26 文件，崩溃 0/0，差异 0/33，缺 range 0） | PASS |
| `typescript/cases/tts/run.mjs` | PASS 429 | **PASS 429 / FAIL 0**，`throw 3/3`、`incremental 426/426` | — |
| `tshape-judge ts-all` | 426/0/3 | **total 429 / ok 426 / failures 3** | — |

default wide-ast 的三条全部转绿：**差异 1 → 0**，剩下的 3 条已知崩溃仍在预期清单内（0/0）；
fallback 73+13 与天花板 85 保持不变。`ex-await-yield` 由 `structural 12 / 差异 1` 变为全绿。

## 4. 目标用例

| 用例 | 结果 |
|---|---|
| `tshape-judge ts tests/cases/token/expressions/ex-await-yield.ts` | **`status: ok`**（structural `[]` / moved `[]` / fields `[]`） |
| `tshape-judge ts tests/cases/token/expressions/expr-generic-inst-statement.ts` | **ok**（未回退） |
| `tshape-judge ts tests/cases/token/statements/stmt-r1236-value-word-brace.ts` | **ok**（未回退） |

`ts-all` 的 3 条失败仍是基线那 3 条 `throw/composite/{class-ball,expression-zoo,generic-container}.ts`
（`incremental-error`，`?.` / `??` / `<` 的形状态未支持），与基线逐字同身位。

## 5. 「0 条原来通过现在失败」

- 两档崩溃恒 0/0；`ts-all` ok 恒 426；`tts` PASS 恒 429；legacy 恒 0/0/2；两档 gates 恒 4/0/7；`real-dts` 恒 PASS。
- default wide-ast：崩溃 0 不变、**差异 1 → 0**（只减不增，且已到 0）、fallback 73 不变。
- **未触发 `git reset --hard $BASE`，无净损失。**

## 6. 清理

- `xl-example-set\r18-await`：`node_modules` 为指向主仓库的 junction，先
  `cmd /c rmdir` 解链（不跟进目标）再整树删除；删后复核主仓库 `node_modules` 仍在。
- ref：`refs/merge/r18` 已 `update-ref -d`（`refs/merge/` 现为空）。
- 分支：`feature/r18-await` 只存在于 set 侧副本，随目录一并移除；主仓库无同名分支。
- 最终 `git status --short` **为空**。

## 7. 最终 HEAD

- 合并提交：`43ac7f7b`；本报告以紧随其后的独立提交落盘（`--oneline` 顶部即最终 HEAD）。
