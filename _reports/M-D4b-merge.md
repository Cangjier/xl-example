# M-D4b 合并报告：decline empty built blocks in shell expressions

| 项 | 值 |
| --- | --- |
| 状态 | **已合并 / 已验收 / 目录已清理 / 未 push** |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` |
| `$BASE` | `8549fc74` `docs(r-d3a2): rollback report R-D3a2` |
| 待合并 | `feature/d4b-initializer`（`f80b69a4` fix + `102572e4` docs），base `609f5526` |
| merge-base | `92db249c`（`docs(d4): merge report M-D4`，已在主线里） |
| 合并提交 | `d2e644ee` `merge(d4b): decline empty built blocks in shell expressions`（`--no-ff`，冲突 0） |
| 临时 ref | `refs/merge/d4b` 已 `update-ref -d` 删除 |

## 1. 预检

三点 diff（`HEAD...refs/merge/d4b`）只有任务声明的三处，无意外路径、无冲突：

```
A  _reports/D4b.md
M  typescript/tokens/direct/direct-expression-engine.xl.md
M  typescript/tokens/direct/direct-statement-assembly.xl.md
3 files changed, 237 insertions(+), 4 deletions(-)
```

## 2. 验收

| 口径 | 期望 | 实测 | 判定 |
| --- | --- | --- | --- |
| `xl_build`（core + typescript） | 0 error | 2 written / 626 skipped / **0 error** / 3 warning（3 条 E1107 是 base 已有的同名类型告警） | PASS |
| `tsc -p .` | exit 0 | **exit 0**，无输出 | PASS |
| `tshape-judge.mjs ts-all`（默认关） | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**，details 恰 3 条（与 base 同一批 throw case） | PASS |
| `typescript/cases/tts/run.mjs --quiet` | PASS 429 | **429 cases / 429 PASS / 0 FAIL** | PASS |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**；wide-ast `FileFallbackCount 2`（基线 2） | PASS |
| `tmp/wide-on.mjs`（两开关强制 ON） | 崩溃 24 / 差异 ~103 / fallback 143 / ok→diff 0 | **崩溃 24 / 有差异 103 / 完全一致 2436 / 缺 range 0 / 越界 0**；`FileFallbackCount 143`、`FileFallbackAttempts 167`、记号形状 650 | PASS |

7 条 N/A 是仓库本身缺源 / 缺产物（`runtime/`、`print-ast-common.xl.md`、`dawn/`、`dist/cpp`），与 D3e 基线一致。

ON 逐文件（`tmp/_md4b-wideon.log`）：

```
跳过 TS 非法 11；解析成功 2539、崩溃 24；AST 完全一致 2436、有差异 103
四方向：缺/多出来 587 条、区间漂移 130 条、字段名 0 条；地基：缺 range 0、越界 0、未映射 0
FileFallbackCount 143；FileFallbackAttempts 167
FAIL 宽尺子：崩溃 24、有差异 103、缺 range 0、越界 0
```

**ok→diff = 0** 的算术依据：ON 语料总数 2563 不变；`ok 2434 → 2436`（+2）与 `diff 105 → 103`（−2）
同时发生，且 `crash 24`、`FileFallbackCount 143` 一字未动 —— 少掉的两条差异正好变成 ok，
没有任何一条 ok 变成 diff（否则 ok 会下降、diff 会上升）。恢复的就是任务点名的两条：

- `tests/cases/token/expressions/expr-yield-await-context.ts`
- `tests/cases/token/statements/st-comment-holds-brace.ts`

## 3. 合并后的机制要点（无源码改动，除 0 处冲突）

`DirectStatementAssembly.BuiltChildren` / `DirectExpressionEngine.BuildArrowBlock` 两处同步：
把 `IsTriviaToken` 与 `IsBasicToken` 拆开，basic token 记为 `raw = true`；
收集结束若 **`raw && collected.length === 0`**（有 raw 代码却零已收语句）就 Decline（`null` /
`Fail` + `null`），由上层 raw 建树路径逐条 `BuildStatement`；只有 trivia 的真空体 `{}` 仍是空块。

## 4. 未做的事（按要求）

- 未 push / 未 pull origin；未建新分支。
- 未重生成 `INDEX.md` / `README.md`（留给 B5）。
- 未改源码（合并 0 冲突，无需手工保双侧）。
- 目录 `xl-example-set\d4b-initializer` 已先解 junction 再删除；`refs/merge/d4b` 已删。
- 收尾 `git status --short` 为空。
