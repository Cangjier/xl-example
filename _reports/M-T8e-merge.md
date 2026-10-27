# M-T8e 合并报告 — 标签模板后缀面 + 已注册根的括号守卫

## 1. 合并事实

| 项 | 值 |
|---|---|
| 主仓库 | `C:\Users\Admin\Documents\GitHub\xl-example` |
| 目标分支 | `feature/all-possible-1027` |
| 合并前 HEAD | `74423f0f49dbebb7277334e0b28abf1df30f8ad4`（工作树干净）✓ |
| 来源 | `xl-example-set/all-possible-1027-t8e` @ `ffa068e01b2e4634b55cc894c4c1845c7facd8aa`，分支 `feature/all-possible-1027-t8e` |
| merge-base | `74423f0f` ✓（等于主仓 HEAD，无前提提交） |
| 合并方式 | `git merge --no-ff refs/merge/t8e` |
| 冲突 | **0**（≤2 预算内） |
| 合并后 HEAD | **`56e573f3ee71f56248af3ca89cd7fd27467c7522`** |
| 父提交 | `74423f0f` + `ffa068e0` ✓ |
| 消息 | `merge(t8e): tagged template postfix + registered-root bracket guard` |

## 2. 三点 diff 预检（`74423f0f...refs/merge/t8e`）

| 文件 | 状态 | 变化 |
|---|---|---|
| `_reports/T8e.md` | A | +165 |
| `typescript/tokens/declarations/variable-declaration-shape.xl.md` | M | +12 |
| `typescript/tokens/expressions/forms/primary/tagged-template-primary-possible-shape.xl.md` | M | +8 / −7 |
| 合计 | **2 xl.md + _reports** | +185 / −7 |

与任务书「2 xl.md + 报告」逐项一致 ✓。来源 2 个 commit：`9ed486cd`（fix）+ `ffa068e0`（docs）。

改动要点：
1. `MemberFollows` 的模板后字符判据从 `.` 扩到 `.` / `[` / `(`：标签模板后跟下标 / 调用括号时整条标签模板
   仍是完整操作数，不收口（判据仍是 `IsTerminalAfter` 的字符级前瞻，未新写机制）；
2. `variable-declaration-shape` 收口格 D1 的「未并入的括号」检查前加一支：括号整只落在根区间之后、
   且根是**登记过身份**的形状（`HasContainer` / `HasNode`）时按后缀放行（`continue`），交给既有
   「整条 raw 原子重建」；未登记根（二元 / 调用形状）行为**逐字不变**，仍抛 C10。

## 3. 验证（未跑 gates）

| 项 | 命令 | 结果 |
|---|---|---|
| build | `xl_build(paths=["core","typescript"], targets=["ts"])` | **2 written / 635 skipped / 0 error / 3 warning**（仅既有 3 条 E1107 重名类型警告）✓ |
| tsc | `node node_modules/typescript/bin/tsc -p .` | **exit 0** ✓ |
| 30 target | `node tmp/target-cases.mjs` | **cases=30 ok=30 moved=0 diff=0 error=0 fallback=0**，`LastFileFallback=0`，`pin-miss=1`（`026` 头部仍写 `xl:expect fallback`，既有现象）✓ |
| 目标 `expr-tag-nonnull-base` | `tshape-judge ts …/expressions/expr-tag-nonnull-base.ts` | `{"status":"ok","structural":[],"moved":[],"fields":[]}` ✓，无 fallback（该文件已不在 fallback 表中） |
| fallback 探针 | 全语料 1716 条（`ParseCore(shell=true)` 首跳 + 默认路径 `LastFileFallback`） | **files=1716 fallback=62** — 与预期 **63 → 62** 吻合 ✓（62 = 61 条 `LastFileFallback=true` + 1 条 `lex-preprocessor-if.ts` 首跳抛错，带 `xl:ts-invalid`） |
| 5 smoke SHA16 | judge `tmp/smoke-t7e/s1..s5.ts` → `ts.json` 取 SHA256 前 16 位 | **5/5 `BB07DA2201FC5087`**（+1 字节）✓，与基线一致 |

smoke 输入：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

已知残留（T8e 报告 §7 已判「不是本格」，本轮不动）：`expr-template-tagged-suffix.ts` 仍 fallback（首跳推进到
「初始化器未读完」，卡在成员链标签），`expr-r1233-control-head-regex.ts` 首跳变为 `CatalogGuide: … ConditionalExpressionShape`。

## 4. 清理

- 本轮临时脚本/产物 `tmp/m-t8e-probe.mjs`、`tmp/m-t8e-fallback.json`、`tmp/m-t8e-judge/`、
  `tmp/m-t8e-smoke/` 已删除，`Get-ChildItem tmp -Filter "m-t8e*"` 无残留 ✓。
- `git update-ref -d refs/merge/t8e` 已执行，`git for-each-ref refs/merge` 为空 ✓。
- 未 push、未改源码、未建分支；最终 `git status --porcelain` 为空（本报告提交后）。

## 5. 结论

T8e 干净合入 `feature/all-possible-1027`，代码 HEAD = **`56e573f3`**。全部预期量逐项命中：
fallback **63 → 62**（−1，正是 `expr-tag-nonnull-base`）、30 target **30/30 fallback=0**、
目标 judge **ok 且无 fallback**、5 smoke SHA16 **全部不变**（`BB07DA2201FC5087`）。build 0 error、tsc exit 0。
