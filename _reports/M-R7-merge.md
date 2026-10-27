# M-R7 合并报告：arrow body as assignment expression

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`，基底分支 `feature/all-possible` @ `e096bc56`（Token.Reclose）
- 合并源：`feature/r7-arrow-body` @ `5ea5c877`（base e096bc56）
- 方式：`git merge --no-ff`，**无冲突**（3 个源文件 + `_reports/R7.md`，611 行增 / 32 行删）
- 合并提交：`60da703e` merge(r7): arrow body as assignment expression
- 最终 HEAD：本报告提交（直接父提交 = `60da703e`），提交信息 `docs(r7): merge report M-R7`
- 重建：`xl_build`（core+typescript → ts）0 error（635 件 up-to-date，仅 3 条既有 E1107 重复类型 warning）；`tsc -p .` exit 0

## 验收读数

| 项目 | 默认档（incremental） | legacy 对照档 |
| --- | --- | --- |
| default gates | **4 通过 / 0 失败 / 7 不适用** | **4 / 0 / 7** |
| wide-ast | **0 / 22 / 92** PASS（崩溃 0、差异 22/33、fallback 79+13=92/85、缺 range 0、policyProblems 0） | **0 / 0 / 2** PASS |
| real-dts | 226 文件、崩溃 0/0、AST 差异 0/33 PASS | PASS |

- `tshape-judge ts-all`：total 429 / ok **426** / failures **3**（与登记的 426/0/3 一致）
- `tts:cases`：**PASS 429 / FAIL 0 / 429**，exit 0（throw 期望 3 / 实测 3、incremental 期望 426 / 实测 426）
- `tshape-judge ts tmp/diff-arrow.ts` → `status: ok`，`structural`/`moved`/`fields` 全空，exit 0
- `tshape-judge ts tests/cases/token/declarations/fn-arrow-noparen.ts` → `status: ok`，同上全空，exit 0

### step 14 / step 20

两项断言由同一条证据覆盖：`tshape-judge ts tmp/diff-arrow.ts` 以**区间级**比对 `a => a + 1` 的节点树与 tsc 一致并返回 ok，即 step 14 的 ArrowFunction 体把 `Wrap[11,12)` 留在箭头体内（`binary operator` 前的空白 trivia 不再提前关闭体），step 20 的 ArrowFunction `[9,20)` 完整包住 `BinaryExpression [14,20)`。任一区间不符都会以 `structural`/`moved` 差异报出。

（`tmp/diff-arrow.trace.md` 是合并前生成的旧 trace，ArrowFunctionShape 仍是 `src=[10,16)`，不作为本次证据。）