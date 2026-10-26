# M-D2b 合并报告：typed tail close by next-line word

| 项 | 值 |
| --- | --- |
| 状态 | **已合并 / 已验收 / 目录已清理 / 未 push** |
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example`，`feature/all-possible` |
| `$BASE` | `2747993a` `docs(m-d4b): merge report for D4b (decline empty built blocks)` |
| 待合并 | `C:\Users\Admin\Documents\GitHub\xl-example-set\d2b-asi`，`feature/d2b-asi`，`9e4432d3`，base `2747993a` |
| merge-base | `2747993a`（即 `$BASE`，快进可，按令 `--no-ff`） |
| 合并提交 | `4b8b309b` `merge(d2b): typed tail close by next-line word`（`--no-ff`，冲突 0） |
| 临时 ref | `refs/merge/d2b` 已 `update-ref -d` 删除 |

## 1. 预检

工作树干净；`git fetch --no-tags ... "feature/d2b-asi:refs/merge/d2b"` 只新增临时 ref。
三点 diff（`$BASE...refs/merge/d2b`）只有任务声明的三处，无意外路径：

```
A  _reports/D2b.md
M  typescript/tokens/declarations/forms/declaration-asi-boundary.xl.md             (+80/−12)
M  typescript/tokens/declarations/variable-declaration-list-possible-shape.xl.md   (+20/−1)
3 files changed, 272 insertions(+), 13 deletions(-)
```

两份 `.xl.md` 合计 +100/−13（与任务描述一致；其余 172 行新增是 `_reports/D2b.md`）。

## 2. 验收

| 口径 | 期望 | 实测 | 判定 |
| --- | --- | --- | --- |
| `xl_build`（core + typescript，target ts） | 0 error | 2 written / 626 skipped / 0 planned / **0 error** / 3 warning（E1107 同名类型，base 已有） | PASS |
| `tsc -p .` | exit 0 | **exit 0**，无输出 | PASS |
| `tshape-judge.mjs ts-all`（默认关） | 426 / 0 / 3 | **total 429 / ok 426 / failures 3**，details 恰 3 条 throw case（`??` / `?.` / `<` 增量变量形状未支持） | PASS |
| `typescript/cases/tts/run.mjs --quiet` | PASS 429 | **429 cases：throw 3/3、incremental 426/426 → PASS 429 / FAIL 0** | PASS |
| `tests/gates/run.mjs` | 4 PASS / 0 FAIL / 7 N/A | **4 通过 / 0 失败 / 7 不适用**；wide-ast `FileFallbackCount 2`（基线 2） | PASS |
| `tmp/wide-on.mjs`（两开关强制 ON） | 崩溃 20 / 差异 88 / fallback 143 / 0 回归 | **崩溃 20 / 有差异 88 / 完全一致 2455 / 缺 range 0 / 越界 0**；`FileFallbackCount 143`、`FileFallbackAttempts 163` | PASS |

7 条 N/A 仍是仓库本身缺源 / 缺产物（`runtime/`、`print-ast-common.xl.md`、`dawn/`、`dist/cpp`），与 D4b/D3e 基线一致。

ON 实测（主仓库 `tmp/wide-on-d2b.mjs`，即克隆里的 `tmp/wide-on.mjs`）：

```
跳过 TS 非法 11；解析成功 2543、崩溃 20；AST 完全一致 2455、有差异 88
失败清单（108 个文件）= 20 崩溃 + 88 差异
FileFallbackCount 143；FileFallbackAttempts 163
FAIL 宽尺子：崩溃 20、有差异 88、缺 range 0、越界 0
```

**0 回归**的算术依据：ON 语料总数 2563 两态相同；`crash 24 → 20`（+4 ok）与
`diff 103 → 88`（−15 ok）合计 +19，而 `ok 2436 → 2455` 恰为 +19 —— 少掉的 19 条全部变成 ok，
没有任何一条 ok 变成 diff（否则 ok 会下降、diff 会上升），`FileFallbackCount 143` 一字未动。

## 3. 合并后的机制要点（0 处冲突，无源码改动）

- `declaration-asi-boundary`：类型声明的收尾改为按**下一行首词**判定（`BlocksTypedTailClose` /
  `NextLineWord`），不再只看本行是否已出现 `;` 一类的收尾记号。
- `variable-declaration-list-possible-shape`：`CloseAtLineBreak` 在 root 宿主上补清
  `MountedUnit`，避免已关闭的声明链在换行后继续挂着单位。

## 4. 未做的事（按要求）

- 未重生成 `INDEX.md` / `README.md`（B5 统一做）。
- 未 push / 未 pull origin；未建新分支；未改任何源码（冲突 0，无需手工保双侧）。
- 未跑 `--write-index`。

## 5. 目录清理

- 克隆 `C:\Users\Admin\Documents\GitHub\xl-example-set\d2b-asi` 内唯一的重解析点是
  `node_modules`（`<JUNCTION> → C:\Users\Admin\Documents\GitHub\xl-example\node_modules`）；
  先用 `rmdir` 解掉 junction，再删整棵树，主仓库 `node_modules` 未被触碰。
- `refs/merge/d2b` 已删除；`git status --short` 为空。
