# M-B4g 合并报告：arrow bracket-body 让位给 legacy 原子建树

## 1 基本信息

| 项 | 值 |
| --- | --- |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example` |
| 目标分支 | `feature/all-possible` |
| `$BASE` | `ef5581da`（工作树干净，无未提交改动） |
| 来源 | `C:\Users\Admin\Documents\GitHub\xl-example-set\b4g-arrow-body` @ `feature/b4g-arrow-body` = `f40133e6` |
| `merge-base` | `ef5581da`（与 BASE 一致，故用 `--no-ff` 显式留合并点） |
| 合并提交 | `e436970d` `merge(b4g): arrow bracket-body yield to legacy atomic pass` |
| 冲突 | 0（`ort` 策略自动合并，未修改任何源码） |

## 2 预检

`git fetch --no-tags ... "feature/b4g-arrow-body:refs/merge/b4g"` 后三点 diff：

```
 _reports/B4g.md                                              | 271 ++++++++++
 typescript/cases/tts/tools/arrow-body-probe.mjs              | 179 +++++
 typescript/cases/tts/tools/arrow-edge-probe.mjs              |  11 +-
 .../forms/primary/arrow-possible-shape.xl.md                 |  78 +++-
 4 files changed, 531 insertions(+), 8 deletions(-)
```

与任务书的改动面吻合：`arrow-possible-shape` 的 `BodyStartsBracket` / `IsNestedArrowHead`，
`arrow-body-probe.mjs` 新增、`arrow-edge-probe` 一条期望，声明族让位、legacy 原子分支建树并 Bind。

## 3 构建

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| xl build | `xl_build { cwd, paths: ["core","typescript"], targets: ["ts"] }` | **0 error**；1 written / 634 skipped；3 warning（`E1107` 重复类型名：`GetAccessor/Signature/SetAccessorPossibleShape`，合并前既有） |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** |

## 4 验收（全部按预期）

| 项 | 命令 | 实测 | 预期 |
| --- | --- | --- | --- |
| default gates | `node tests/gates/run.mjs` | **4 通过 / 0 失败 / 7 N/A**，exit 0 | 4/0/7 |
| legacy gates | `node tests/gates/run.mjs --legacy` | **4 / 0 / 7**，exit 0 | 4/0/7 |
| wide-ast（默认） | 门内 | **PASS**：崩溃 0/0、差异 **29**/33、fallback **82+13=95**/85、缺 range 0、越界 0、policyProblems 0 | 0 / 29 / 95 |
| wide-ast（`--legacy`） | `node tests/parse/wide-ast.mjs --legacy` | **PASS 0/0/2**（fallback 2+0=2/2） | 0 / 0 / 2 |
| real-dts | 门内 | **PASS**：崩溃 0/0、差异 0/33、缺 range 0 | PASS |
| tts | `node typescript/cases/tts/run.mjs` | **PASS 429 / FAIL 0**（throw 3/3、incremental 426/426） | 429 |
| tshape-judge ts-all | `node typescript/cases/tts/tools/tshape-judge.mjs ts-all` | 总 429、ok **426**、failures **3**（既有 3 条增量变量形状未支持，expect=throw 实测 throw） | 426/0/3 |
| arrow-body-probe | `node typescript/cases/tts/tools/arrow-body-probe.mjs` | **ARROW-BODY-PROBE PASS** | PASS |
| arrow-edge-probe | 同上 | **ARROW-EDGE-PROBE PASS** | PASS |
| arrow-param-probe | 同上 | **ARROW-PARAM-PROBE PASS** | PASS |

未触发 `git reset --hard $BASE`。

## 5 未做 / 边界

- 未重生成 `typescript/cases/tts/INDEX.md`、`README.md`，未改任何 `xl.md` 源码。
- 未 push / pull origin（全程只 fetch 本地路径）。
- 未新建分支；`refs/merge/b4g` 合并后已 `update-ref -d` 删除。

## 6 目录清理

- `xl-example-set\b4g-arrow-body`：先解 junction 再删。
  - 唯一的 reparse point：`node_modules` → `C:\Users\Admin\Documents\GitHub\xl-example\node_modules`
    （深度 2 扫描只此一个）。
  - 用 `[System.IO.Directory]::Delete($jn, $false)` 只删链接本身；删前/删后分别确认主仓库
    `node_modules` 仍存在（未伤及目标）。
  - 随后 `Remove-Item -Recurse -Force` 整目录，`Test-Path` = False。
- 上级 `xl-example-set\` 仅剩 `_reports`（共享目录，非本次产物，保留）。
- `git update-ref -d refs/merge/b4g` 成功，`git branch --list '*b4g*'` 无输出。
- 最终 `git status --short` **为空**。

## 7 结论

B4g 合并完成：冲突 0，构建 0 error，12 项验收全部命中预期读数，
目录与临时 ref 清理干净，主仓库工作树保持干净、仅多一个报告提交。
