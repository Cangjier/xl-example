# M-T11 合并报告

- 主仓库：`C:\Users\Admin\Documents\GitHub\xl-example`
- 目标分支：`feature/all-possible-1027`
- 合入：`refs/merge/t11` = `e22bd3f0`（base `1da421f9`）
- 合并前 HEAD：`1da421f9`（与任务书一致），工作树干净
- 合并方式：`git merge --no-ff`，**冲突 0 处**
- 合并提交信息：`merge(t11): ternary/type-position arrow branches`
- 合并后 HEAD：`b9c1c5bc7444038588711ad26420e9fa37808dba`

## 预检

| 项 | 结果 |
| --- | --- |
| 合并前 HEAD | `1da421f9`（一致） |
| 工作树 | 干净 |
| merge-base | `1da421f9`（快进基线正确） |
| 三点 diff | 5 文件：`_reports/T11.md`(A) + 4 个 `xl.md`(M)，与任务书一致 |

4 个 `xl.md`：`tokens/statements/bracket-role-resolver.xl.md`、`tokens/declarations/function-declaration-shape.xl.md`、
`tokens/statements/block-possible-shape.xl.md`、`tokens/expressions/forms/operator/conditional-possible-shape.xl.md`。

## 验证（未跑 gates）

| 检查 | 期望 | 实测 |
| --- | --- | --- |
| `xl build` | 0 error | **4 文件写出 / 580 跳过 / 0 error**（3 条 E1107 为既有重复类型告警） |
| `tsc -p .` | exit 0 | **exit 0**，无诊断 |
| 4 条目标 judge | ok、无 fallback | **4/4 `{"status":"ok","structural":[],"moved":[],"fields":[]}`** |
| 30 target（`node tmp/target-cases.mjs`） | 30/30、fallback=0 | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0 \| LastFileFallback=0 \| pin-miss=1** |
| 全语料 fallback | 54 → 50 | **54 → 50（−4）**，`files=1716`，`errors=1`（`lex-preprocessor-if.ts`，base 同样 errors=1，既有） |
| 1716 逐文件 AST 指纹 | 不变 | **逐文件 sha1 全等，changed=0**（base 与 merged 的汇总摘要同为 `a414b97dcd1cfcb9`） |
| 5 smoke `ts.json` SHA256 前 16 位 | 不变 `BB07DA2201FC5087` | **5/5 `BB07DA2201FC5087`**（smoke-if / smoke-add / smoke-call / smoke-class / smoke-obj） |

`pin-miss=1` 为既有现象（026 的 `// xl:expect fallback` 按要求未改），与本轮无关。

1716 AST 的做法：在 `1da421f9` 的独立 worktree 里重新 `xl build` + `tsc`，再与本树用同一脚本
（`tmp/m11-digest.mjs`：逐文件 `cjAst` 序列化取 sha1，汇总为 sha256 前 16 位）逐条对比：
base `files=1716 fallback=54`, merged `files=1716 fallback=50`, 两边摘要均 `a414b97dcd1cfcb9`，
即 **AST 字节级不变，只有 fallback 计数下降**。

4 条目标 judge 的 `ts.json` 各自哈希亦为 `BB07DA2201FC5087`（与 5 smoke 同体）。

## 内容落地

- `bracket-role-resolver.xl.md`：函数/方法头部参数表判据（只认第一只 `(`）、谓词 `is (` 让路、三目分支 `(` 让路。
- `function-declaration-shape.xl.md`：`OpenParameterList` 闸门，避免族 hook 旁路建出 `ParameterShape`。
- `block-possible-shape.xl.md`：`EnclosedByTypeBody` —— 最近目录括号是类型体时不给 `=> {` 挂块体目录。
- `conditional-possible-shape.xl.md`：`HasArrowBranch` —— 三目分支是箭头时 `IsBuildable=false`，整条交 legacy。

## 收尾

- 临时产物已清理：`tmp/m11-base`（worktree + junction）、`tmp/m11-*` 探针与 json；最终 `git status` 空。
- `refs/merge/t11` 已删除。未 push、未改源码、未建分支。
