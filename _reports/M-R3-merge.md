# M-R3 合并报告：general shape position calculation

- 主仓库：`xl-example`，合并前 `feature/all-possible` @ `3f864558`（工作树干净，$BASE = 3f864558）
- 来源：`xl-example-set/r3-position`，分支 `feature/r3-position`，commit `d575337c`
- fetch：`git fetch --no-tags <src> "feature/r3-position:refs/merge/r3"` → `refs/merge/r3` = `d575337c`
- 三点 diff 预检：`3f864558...d575337c`，8 文件 / +291 / -103，与预期一致
- 合并：`git merge --no-ff refs/merge/r3 -m "merge(r3): general shape position calculation"` → **0 冲突**（主仓库未越过 base，无重叠）

## 合并内容

| 类型 | 文件 |
| --- | --- |
| 新增 | `typescript/tokens/positions/shape-position.xl.md`（100 行） |
| 迁移 | `ControlHead` / `ExpressionBracket` / `NamedImports` / `NamedExports` / `ObjectBindingPattern` / `ImportAttributes`（6 个 `-possible-shape.xl.md`） |
| 报告 | `_reports/R3.md`（随分支带入） |

## 构造

- `xl_build`（cwd=repo，paths=`core`+`typescript`，target=`ts`）：**7 written / 628 skipped / 0 error**，3 warning（`E1107` 重复类型声明，`class-get-accessor` / `class-index-signature` / `class-set-accessor`，合并前既有，非本次引入）
- `tsc -p .`：**exit 0**

## 验收（两档读数）

| 项目 | 期望 | 实测 | 结论 |
| --- | --- | --- | --- |
| `gates`（default） | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `gates --legacy` | 4/0/7 | 4 通过 / 0 失败 / 7 不适用 | 一致 |
| `wide-ast`（default） | 0/25/93 | 崩溃 0 / 差异 25/33 / fallback 80+13=93/85 | PASS |
| `wide-ast --legacy` | 0/0/2 | 崩溃 0 / 差异 0 / fallback 2/2 | PASS |
| `real-dts` | PASS | default + legacy 均 PASS（崩溃 0、差异 0、缺 range 0） | PASS |
| `tts` | PASS 429 | `[tts] PASS 429 / FAIL 0 / 429` | PASS |
| `tshape-judge ts-all` | 426/0/3 | `total 429 / ok 426 / failures 3` | 一致 |
| `tshape-judge ts tmp/diff-if.ts` | ok | `status: ok`（structural/moved/fields 全空） | ok |
| `tshape-judge ts .../stmt-if-multiline-condition.ts` | ok | `status: ok`（structural/moved/fields 全空） | ok |

`ts-all` 的 3 条失败均为既有基线，与 R3 无关：
`throw/composite/class-ball.ts`、`throw/composite/expression-zoo.ts`、`throw/composite/generic-container.ts`
（失败原因均为 `??` 空值合并与泛型 `new` 的增量形状未支持）。

## 收尾

- 未重生成 `INDEX` / `README`（留给后续统一处理）
- 未 push、pull origin
- 目录清理：先 `cmd /c rmdir` 解除 `r3-position\node_modules` junction（指向主仓库 `node_modules`），确认主仓库 `node_modules` 条目数不变后再删除 `xl-example-set\r3-position`
- `git update-ref -d refs/merge/r3` 已执行
- 最终 `git status --short` 为空

## 最终 HEAD

`dc6576ebb2d5bba666b88b8ffde5af61c3c1896c`（merge commit，父：`3f864558` + `d575337c`）
