# team-roster — 成员、波次、接力与 spawn 清单

- 作者：`design-plan-1`（task-5），分支 `design-plan`
- 配套：`docs/refactor/PLAN.md`（工作包与门禁）、`docs/refactor/OPEN-QUESTIONS.md`（待用户拍板）
- 协议唯一来源仍是 `set\TEAM.md`；本文只补「谁在第几波做什么」。

---

## 1. 命名与目录规则（沿用 TEAM.md）

| 项 | 规则 | 示例 |
|---|---|---|
| 成员名 | 小写 kebab，`角色-包`；**成员名 = 文件夹名 = 分支名** | `impl-wp2`、`merge-wp3`、`verify-final` |
| 实现成员 | `impl-wp<n>`；接力 `impl-wp<n>-2`、`-3` | `impl-wp2-2` |
| 合并成员 | `merge-wp<n>`；返工重合并 `merge-wp<n>-2` | `merge-wp0` |
| 文档合并 | `merge-docs` | 只合 `docs/refactor/**` |
| 最终验收 | `verify-final` | 不合并，只出报告 + tag |
| 工作分支 | 与成员同名；**从 `refactor-integration` 起**（WP-0 首次从 `main` 起） | `impl-wp4` |
| 接力 | `new-member -Name X-2 -From X -Base X`（读前任 `HANDOFF.X.md` 续做） | `impl-wp6-2` |

**铁律**：实现成员不合并、不 push 集成分支；merger 不改源码；不改别人的成员文件夹（用 `tools\fetch-branch.ps1`）；
不改源仓库 `xl-example`；不 push 网络 remote；不 npm install（node_modules 是 junction）。

---

## 2. 波次总表

| 波 | 成员（可并行） | 包 | 分支基点 | 预估轮数 | 产出去向 |
|---|---|---|---|---|---|
| 0 | `merge-docs` | 文档合并（PLAN/roster/OPEN-QUESTIONS） | `refactor-integration`（= main） | 1–2 | 集成分支 docs commit |
| 1 | `impl-wp0` | WP-0 基座（batch + engine 契约 + shadow + inventory） | `refactor-integration` | 8–10 | → `merge-wp0` |
| 1b | `merge-wp0` | WP-0 合并（首个） | `main` / 集成分支 | 2–3 | `refactor-integration` |
| 2 | `impl-wp1`、`impl-wp2` | WP-1 enum 试点、WP-2 语句状态机（**并行**） | `refactor-integration`（含 WP-0） | 5–6 / 9–10(+`impl-wp2-2`) | `merge-wp1` → `merge-wp2` |
| 3 | `impl-wp3`、`impl-wp4`、`impl-wp5` | WP-3 根级、WP-4 interface、WP-5 class（**并行**） | 集成分支（含 WP-1、WP-2） | 7–9 / 7–8 / 7–8 | `merge-wp3`→`4`→`5` |
| 4 | `impl-wp6`（+`impl-wp6-2`） | WP-6 module/switch/try + clause | 集成分支（含 WP-3） | 8–10 | `merge-wp6` |
| 5 | `impl-wp7` | WP-7 删 possible 层 | 集成分支（含 WP-1..6） | 4–6 | `merge-wp7` |
| 6 | `verify-final` | WP-F 最终验收 + 报告 | 集成分支（含 WP-7） | 3–4 | tag `refactor-integration/final` |

> 合并顺序固定：WP-0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 最终。并行包的工作分支**从当时最新集成分支起**；
> 若合并顺序在其之后（如 WP-2 先于 WP-1 的合并顺序），交付前在自己 clone 里
> `fetch-branch` 集成分支并 rebase/merge，跑 Q/S 后再交接。

### 2.1 10 轮上限与接力

- 每成员 ≤10 轮；**剩 2 轮**时停止开新工作 → 跑门禁 → commit → 写 `HANDOFF.<name>.md`（固定格式见 TEAM §8.2）。
- 预计需要接力的包：`impl-wp0`（8–10 轮，边界）、`impl-wp2`（9–10 轮，很可能）、`impl-wp6`（8–10 轮）。
- 接力 spawn：
  ```powershell
  cd C:\Users\Admin\Documents\GitHub\xl-example-set
  .\tools\new-member.ps1 -Name impl-wp2-2 -From impl-wp2 -Base impl-wp2
  ```
  新 agent 先读前任 `HANDOFF.impl-wp2.md` → 从「下一步的精确命令」开干；**不要重跑前任已跑过的耗时测量**。
- 接力者必须保留前任的未合并 commit（同一分支）；HANDOFF 里写清「已改哪些文件、门禁读数、下一步命令」。

---

## 3. spawn prompt 必含信息清单（Lead 复制模板）

每个 impl / merge / verify 成员的 prompt 必须包含以下 12 项（缺一项就会多烧 1–2 轮）：

1. **身份与路径**：成员名、clone 绝对路径 `C:\Users\Admin\Documents\GitHub\xl-example-set\<name>`、分支名、基点分支与 commit。
2. **必读文档**（按顺序）：`..\TEAM.md`（全部）、`docs/refactor/PLAN.md` 的 §1/§4/§6/§8、本包卡片、相关设计原文
   （`design-drive.md` / `design-bodies.md` / `gates-baseline.md` 的指定章节）、前任 HANDOFF（接力时）。
3. **写范围**：PLAN §6.2 里本包允许的**文件前缀清单**（逐字给出），并明确「不碰别人的范围」。
4. **构建方式**：**没有 xl CLI**；用 agent 工具 `xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")`，
   然后 `node .\node_modules\typescript\bin\tsc -p tsconfig.json`。`out` 必须是 `dist`（写 `build` → tsc 无输入 → 全红）。
5. **node_modules**：clone 时由 `new-member.ps1` 建目录 junction 到源仓库；**不要 npm install**；断了就重跑 new-member 到新文件夹。
6. **门禁**：`..\tools\gates.ps1 -Tier quick|standard|full -BaseBuild ..\baseline-build\build`（本包矩阵见 PLAN §8.2）。
7. **已知红**：`tests/gates/run.mjs` 基线 1/8（informational，别修）；`body-guide --no-generic` 假红（**禁止当门禁**）；
   根级 `xl build` E1006（只构建 core+typescript）；`statement-scaling` 在 WP-2 前 informational。
8. **快照纪律**：`ast-json.mjs` 会重写 `typescript/cases/*.cj-ast.json`，跑完 `git checkout -- typescript/cases` 再 commit。
9. **轮次纪律**：≤10 轮；每完成一个可独立验证小块就 commit（不攒）；剩 2 轮写 HANDOFF（`HANDOFF.<name>.md`，别覆盖历史 `HANDOFF.md`）。
10. **共享文件**：**不许改** `..\tools\*.ps1`、`..\TEAM.md`、`..\baseline-perf.json`、`..\upstream.git`、源仓库；
    `..\baseline-build` 只读。
11. **汇报**：完成/交接时 `send_message` 给 `lead`，用 TEAM §9 模板（folder/branch/base、命令+耗时、门禁逐项、未完成/阻塞原文）。
12. **环境坑**：Windows PowerShell 5.1（**本机无 pwsh**）；脚本必须 UTF-8 **with BOM**；git 的 stderr 红色进度是正常现象；
    并发跑门禁会污染性能读数（测量前确认没有别人在跑）。

### 3.1 每个包额外要带的「本包专属」信息

| 包 | 额外信息 |
|---|---|
| WP-0 | 11 个 basic token 的 Close 清单（9 token + Bracket + EOF 哨兵）；`WrapSymbol` 不通知；INV-1..7 写进注释；shadow 只用于测试构建；产出 `file-inventory.md` |
| WP-1 | enum「不按换行切」的恢复形口径；`body-guide-util` 只删 `MountBodyGuide/CreateShapesCache`，其余保留 |
| WP-2 | `StatementScanner` 降为 oracle + 纯谓词；13 组 `Scan*` 的分支对照表；`BuildBlock` 兼容性核实优先（Q7）；ORACLE/SPLIT 门禁自建 |
| WP-3 | `SourceFileEndPossibleShape` **先整文件机械搬**再拆；EOF 批由 WP-0 提供；`SourceFileShape.Close` 三次全扫要消 |
| WP-4 | `MemberPossibleUtil` 在 `property-signature-possible-shape` 里，**先搬后删**；区间口径含 `;`/`,`；`MemberParsedWhole` 不建不 splice |
| WP-5 | 装饰器锚定与修饰词边界最易错；属性初始化器 `{`/`(` 必须已闭合才算 item 末尾；恢复形探针扩测 |
| WP-6 | `BuildMember` 的 `Pos` 重锚 + `DataCursorAt` 单调游标保留；ambient 无分号收口；两级 handoff 用例 |
| WP-7 | 删除顺序 D-a→D-b→D-d→D-c→D-e→D-f；每 20–40 文件一批 commit；共享协议最后删；`xl_orphans` 清残留 |
| merge-* | 只 `merge --no-ff`，不 squash、不手工解冲突；门禁 `full -BaseBuild` PASS 才 push；tag `merge/WP-n-seq` |
| verify-final | 必须**串行无并发**；3 轮 parse-perf；报告写「测量时段是否有其它 agent 并发」 |

---

## 4. 合并成员（独立于实现）

| 成员 | 负责包 | 关键动作 | 轮数 |
|---|---|---|---|
| `merge-docs` | 文档 | 把 `design-plan` 的 `docs/refactor/{PLAN,team-roster,OPEN-QUESTIONS}.md` 以 docs-only 合入集成分支 | 1–2 |
| `merge-wp0` | WP-0 | 首个合并：从 main 起，合 `impl-wp0`，full 全绿后推 `refactor-integration` | 2–3 |
| `merge-wp1` / `merge-wp2` | WP-1 / WP-2 | 每包 2–3 轮；可同一成员连做（每包独立 clone 或复用） | 2–3/包 |
| `merge-wp3` / `merge-wp4` / `merge-wp5` | 波 3 三包 | 建议一个 merger 顺序做 3 次或 3 个独立成员；冲突按 PLAN §7.4 退回 owner | 2–3/包 |
| `merge-wp6` / `merge-wp7` | WP-6 / WP-7 | WP-7 合并后额外跑 `gates -Strict` 并记录 KNOWN-RED | 2–3/包 |
| `verify-final` | WP-F | 不合并；跑最终验收、写 `final-report.md`/`perf-report.md`、打 tag | 3–4 |

**merger 标准 prompt 附加项**：`fetch-branch.ps1` 用法、`git merge --no-ff`、`full -BaseBuild` 通过才 push、
失败 `merge --abort` 并报 Lead、tag 约定（PLAN §7.3）、**不把 HANDOFF/文档噪音合进集成分支**。

---

## 5. 批准后建议立刻 spawn 的成员（1–3 个）

1. **`impl-wp0`**（必选，立即）—— `docs/refactor/PLAN.md` §6.3 WP-0 + §1 架构契约。
   一句话范围：**建批次层与 item 引擎契约、11 个 basic token Close 改回调、LegacyBatchAdapter/shadow、零行为变化**。
   ```powershell
   cd C:\Users\Admin\Documents\GitHub\xl-example-set
   .\tools\new-member.ps1 -Name impl-wp0            # 从 main 起（首个包）
   ```
2. **`merge-wp0`**（建议同批 spawn）—— 先完成 clone 与 `baseline-build` 校验、准备 `gates full -BaseBuild` 命令，
   等 Lead 转来 `impl-wp0` 的 HANDOFF/报告后执行首次合并。一句话范围：**把 WP-0 合入并创建 `refactor-integration`**。
3. （WP-0 合并后立即）**`impl-wp1` + `impl-wp2`** 并行 spawn —— 一句话范围：
   **impl-wp1 = enum 试点验证引擎契约；impl-wp2 = 语句增量状态机 + block 表（收益主战场）**。

> 不建议在 WP-0 合并前 spawn WP-1/WP-2：它们依赖 `core/syntax/batch/**` 契约冻结，提前动手只会返工。
> 若 Lead 想削峰，可让 WP-1/WP-2 的 agent 先只读三份设计并产出 1 页「开工计划」，不写代码。

---

## 6. 规模预估（给 Lead 排期）

- 实现包 8 个 + 验收 1 个；预计接力 2–3 次（`impl-wp0-2`、`impl-wp2-2`、`impl-wp6-2`）。
- 成员总数估计：实现 10–13 + 合并 5–7 + 验收 1 ≈ **16–21 个 agent 会话**；每会话 ≤10 轮。
- 墙钟：若每波串行、每包 1–2 天等效轮次，预估 **6 波 × 1–2 天**；并行组 `{WP-1,WP-2}`、`{WP-3,WP-4,WP-5}`
  可压缩总时长约 30%。
- **性能测量必须错峰**：同一时刻最多 2 个成员跑门禁；WP-F 与所有 merger 的 `full -BaseBuild` 最终验收要串行空时段。
