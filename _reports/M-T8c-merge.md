# M-T8c 合并报告 — import 路由跳过 `type` 修饰词

## 1. 合并事实

| 项 | 值 |
|---|---|
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example` |
| 目标分支 | `feature/all-possible-1027` |
| 合并前 HEAD | `e5230e3dccb1f0ffe8bcc3ecc97c9405c602d501`（工作树干净）✓ |
| 来源 | `xl-example-set/all-possible-1027-t8c` @ `4d9b8ad9`，分支 `feature/all-possible-1027-t8c` |
| merge-base | `e5230e3d` ✓（等于主仓 HEAD，无前提交） |
| 合并方式 | `git merge --no-ff refs/merge/t8c` |
| 冲突 | **0**（≤2 预算内） |
| 合并后 HEAD | **`c064c4137e3e91607fddce16b7541b53e492a931`** |
| 消息 | `merge(t8c): import type-equals routing` |

## 2. 三点 diff 预检（`e5230e3d...refs/merge/t8c`）

| 文件 | 状态 | 变化 |
|---|---|---|
| `_reports/T8c.md` | A | +163 |
| `typescript/tokens/statements/statement-route-util.xl.md` | M | +15 / −1 |
| 合计 | 1 xl.md + _reports | +178 / −1 |

与任务书「1 xl.md + _reports」逐项一致 ✓。来源仅 1 个 commit（`4d9b8ad9`）。

改动要点：`import` 后的第二代码单元为 `type` 时，把探 `=` 的落点从 `nextAt + 1` 改为 `nameAt + 1`（`nameAt = ItemUtil.NextCode(units, nextAt + 1)`），
即跳过 `type` 这个不占名字位的类型修饰词；`import type = require("m")`（`type` 本身是别名）仍交回 legacy；`type {` / `type *` / `type X from` 跳过之后探不到 `=`，行为不变。不比行终止符（`import` 与 `type` 之间换行/夹注释仍算一条 import-equals）。

## 3. 验证（未跑 gates）

| 项 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"])` | **1 written / 636 skipped / 0 error / 3 warning**（仅既有 E1107 重名类型告警）✓ |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** ✓ |
| 30 target | `node tmp/target-cases.mjs` | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**，`LastFileFallback=0`，pin-miss=1（`026` 头部仍写 `xl:expect fallback`，T4 输入未改，既有现象）✓ |
| 选中 case | `tshape-judge ts tests/cases/token/modules/mod-import-type-equals.ts` | `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| 同族 3 条 | `tshape-judge ts` × `type-head-newline`(334) / `from`(391) / `require-args-newline`(312) | **3/3 `status: ok`** ✓ |
| 默认路径无 fallback | `node tmp/t8c-selected.mjs` | 4 条全 **`LastFileFallback=false fallbackDelta=0 firstHop=ok`** ✓ |
| 5 smoke SHA16 | judge 5 条 → 对 `ts.json` 取 SHA256 前 16 位 | **5/5 `BB07DA2201FC5087`**，71 字节、exit 0、body 全 `ok` ✓（与 T1 基线一致） |
| fallback 探针 | `node tmp/t8c-probe.mjs`（全语料 1716 条） | **files=1716 fallback=65** — 与预期 **69 → 65** 逐数吻合 ✓ |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`（`tmp/smoke-t7e/s1..s5.ts`）。

## 4. 清理

- `tmp/t8c-probe.mjs`、`tmp/t8c-selected.mjs`、`tmp/t8c-fallback-merged.json`、`tmp/t8c-smoke/`、`tmp/t8c-judge-*/` 已删除，`Get-ChildItem tmp -Filter "t8c*"` 无残留 ✓。
- `git update-ref -d refs/merge/t8c` 已执行，`git for-each-ref refs/merge` 为空 ✓。
- 未 push、未改源码、未建分支。

## 5. 结论

T8c 干净合入 `feature/all-possible-1027`，HEAD = **`c064c413`**。全部预期量逐项命中：
fallback **69 → 65**（−4，正是 import-equals 家族 4 条）、30 target **30/30 fallback=0**、
5 smoke SHA16 **全部不变**（`BB07DA2201FC5087`）、build 0 error、tsc exit 0。工作树空。
