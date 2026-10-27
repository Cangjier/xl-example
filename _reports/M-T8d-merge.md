# M-T8d 合并报告 — 类型面初始化器在比较符处不再提前落地

## 1. 合并事实

| 项 | 值 |
|---|---|
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example` |
| 目标分支 | `feature/all-possible-1027` |
| 合并前 HEAD | `34dfa7168eeb9f68df52982d5485cae9caeb5f92`（工作树干净）✓ |
| 来源 | `xl-example-set/all-possible-1027-t8d` @ `48306509b4ae4d5ce9c06f82b1570dbf515b2363`，分支 `feature/all-possible-1027-t8d` |
| merge-base | `34dfa716` ✓（等于主仓 HEAD，无前提交） |
| 合并方式 | `git merge --no-ff refs/merge/t8d` |
| 冲突 | **0**（≤2 预算内） |
| 合并后 HEAD | **`b911b5cb4b5bc554582bde1116c2504ad789eceb`** |
| 消息 | `merge(t8d): end typed initializer at comparison operator` |

## 2. 三点 diff 预检（`34dfa716...refs/merge/t8d`）

| 文件 | 状态 | 变化 |
|---|---|---|
| `_reports/T8d.md` | A | +176 |
| `typescript/tokens/types/type-catalog-factory.xl.md` | M | +45 / −7 |
| 合计 | 1 xl.md + _reports | +214 / −7 |

与任务书「1 文件 2 处 + 报告」逐项一致 ✓。来源仅 1 个 commit（`48306509`）。

改动要点：
1. 新增 `NextSignificantText(unit, take)`（原 `NextSignificantChar` 扫描体推广成前 `take` 个非空白/非注释字符，`take===1` 与旧实现同源）；
2. `CanEndInitializer` 加一条判据：`=` 后面还是 `=` 就不算初始化器终点（`==` / `===` 是二元比较符，`=>` 与单个 `=` 行为不变）。

## 3. 验证（未跑 gates）

| 项 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"])` | **1 written / 636 skipped / 0 error / 3 warning**（仅既有 E1107 重名类型告警）✓ |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** ✓ |
| 30 target | `node tmp/target-cases.mjs` | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**，`LastFileFallback=0`，pin-miss=1（`026` 头部仍写 `xl:expect fallback`，既有现象）✓ |
| `expr-as-then-value-operator` | `tshape-judge ts …/expressions/expr-as-then-value-operator.ts` | `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| `type-pred-arrow` | `tshape-judge ts …/types/type-pred-arrow.ts` | `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓ |
| fallback 探针 | 全语料 1716 条（`ParseCore` 首跳 + 默认路径 `LastFileFallback`） | **files=1716 fallback=63** — 与预期 **65 → 63** 吻合 ✓（63 = 62 条 `LastFileFallback=true` + 1 条 `lex-preprocessor-if.ts` 首跳抛错，该 case 带 `xl:ts-invalid`；两条被修好的 case 均不再出现） |
| 5 smoke SHA16 | judge `tmp/smoke-t7e/s1..s5.ts` → `ts.json` 取 SHA256 前 16 位 | **5/5 `BB07DA2201FC5087`**，71 字节 ✓（与基线一致） |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

## 4. 清理

- 本轮临时脚本/产物 `tmp/m-t8d-probe.mjs`、`tmp/m-t8d-files.txt`、`tmp/m-t8d-fallback.out`、`tmp/m-t8d-judge-*/`、`tmp/m-t8d-smoke/` 已删除，`Get-ChildItem tmp -Filter "m-t8d*"` 无残留 ✓。
- `git update-ref -d refs/merge/t8d` 已执行，`git for-each-ref refs/merge` 为空 ✓。
- 未 push、未改源码、未建分支；最终 `git status --porcelain` 为空（本报告提交后）。

## 5. 结论

T8d 干净合入 `feature/all-possible-1027`，代码 HEAD = **`b911b5cb`**。全部预期量逐项命中：
fallback **65 → 63**（−2，正是 `expr-as-then-value-operator` 与 `type-pred-arrow`）、
两条目标 judge 全 **ok**、30 target **30/30 fallback=0**、5 smoke SHA16 **全部不变**
（`BB07DA2201FC5087`）、build 0 error、tsc exit 0。
