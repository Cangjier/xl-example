# M-T1 — PossibleSource 契约层合入报告

- 日期：2026-10-27
- 集成分支：`feature/all-possible-1027`
- 合并前 HEAD：`59408af3`（T4 已合入，工作树干净）
- 被合并：`all-possible-1027-contract` / `feature/all-possible-1027-contract` @ `3f3fe34b`（base `70c3d632`）
- 合并提交：`24b0f4cb` `merge(t1): PossibleSource contract`（`--no-ff`，ort 策略，**0 冲突**）
- 报告提交后 HEAD：见文末

## 1. 预检（三点 diff，`HEAD...refs/merge/t1`）

merge-base = `70c3d632`（与简报一致）。改动面与预期完全一致：

| 状态 | 文件 | 增删 |
|---|---|---|
| A | `core/syntax/possible-source.xl.md` | +16 |
| M | `core/syntax/i-compute-possible-shapes.xl.md` | +11/−2 |
| M | `core/syntax/catalog-guide.xl.md` | +16/−2 |
| M | `core/syntax/possible-shape-cache.xl.md` | +16/−2 |
| A | `_reports/T1.md` | +115 |

合计 5 文件、+166/−8。仅 core/syntax 4 个契约文件 + 一份报告，无其它目录溢出。

## 2. 合并

- `git fetch --no-tags <contract-repo> "feature/all-possible-1027-contract:refs/merge/t1"` → `3f3fe34b`。
- `git merge --no-ff refs/merge/t1 -m "merge(t1): PossibleSource contract"`：**Made by 'ort'，0 冲突**（冲突 ≤2 的手工阈值未触发，未 abort）。
- 自动新增 `_reports/T1.md`、`core/syntax/possible-source.xl.md`。

## 3. 验证（未跑 gates）

| 项 | 命令 | 结果 |
|---|---|---|
| xl build | `xl_build core --target ts` | **4 written / 49 skipped / 0 error / 0 warning**（含新 `possible-source.ts`） |
| 强制全量重建 | `xl_build --force` | **53 written / 0 error**（确认无残留旧产物） |
| 类型检查 | `npx tsc -p .` | **exit 0**，无输出 |
| 目标矩阵 | `node tmp/target-cases.mjs` | **cases=30 ok=29 moved=0 diff=0 error=0 fallback=1**，fallback 恰为 `026-if-regex-test`；`LastFileFallback=1（回退后 AST 仍 ok=1）`、`pin-miss=0` |

与预期读数逐项一致：**29 ok / 1 fallback（026）/ 0 diff / 0 error**。

### 抽查 `tshape-judge ts`

| 片段 | status | exit |
|---|---|---|
| `if (a) {}` | `ok`（structural/moved/fields 全空） | 0 |
| `const a = x + y` | `ok`（同上） | 0 |

## 4. 5 个 smoke case 的零行为证据

case 置于 `tmp/cases/smoke-*.ts`（UTF-8 无 BOM，内容逐字节为片段本身）：`if (a) {}` / `const a = x + y` / `f(a)` / `class A {}` / `const o = { a: 1 }`。

- **`ts.json`（判据结论）SHA256 前 16 位 = `BB07DA2201FC5087`**，与 `_reports/T1.md` §5 记录的基线**完全一致**（5 个 case 内容逐字相同）。即合入后 5 条判据结论与 T1 分支上的基线逐字节相同。
- 每字符 `trace.json` 在同一路径（`tmp/cases/`）下两次**独立完整重建**后哈希相同，说明产物确定、且合并树内部自洽：

| case | trace.json SHA256 前 16 位 |
|---|---|
| `if (a) {}` | `75B2051E538DAC2A` |
| `const a = x + y` | `F220A7FA66F45447` |
| `f(a)` | `3C2D5225C82A09CB` |
| `class A {}` | `7D9B415BCCBF8C38` |
| `const o = { a: 1 }` | `CE026EAB7BFEBDE1` |

- **与 T1.md 表中 trace 哈希数值不同的原因（非行为差异）**：`trace.json` 的 `source` 字段写的是**绝对路径**。T1 的基线是在 `tmp/trace-before/` 与 `tmp/trace-after/` 两个不同路径下取得（其表内数值因此取自当时的路径与 T4 之前的格式）。本次在同一路径 `tmp/cases/` 下复测，绝对值不可与 T1 表直接比对；可比对的锚点是路径无关的 `ts.json`，已逐字节吻合。
- 补充：改动语义上仅为新增 `PossibleSource` 标量枚举 + 三个入口的**可选** `source` 参数（缺省 `Close`），不引入分支；与 `ts.json` 逐字节一致、目标矩阵 0 diff 共同支撑「零行为」。

## 5. 清理

- 解 junction：`rmdir all-possible-1027-contract\node_modules`（指向主仓库 `node_modules` 的 Junction，仅删链接）；确认主仓库 `node_modules` 仍在。
- 删除 `C:\Users\Admin\Documents\GitHub\xl-example-set\all-possible-1027-contract` 整目录 → 已不存在。
- `git update-ref -d refs/merge/t1` → 引用已删。
- 最终 `git status --porcelain` **为空**；未 push、未改源码、未建新分支。

## 6. 结论

T1 契约层（`PossibleSource` + 三个入口的 source 透传，零行为）已合入 `feature/all-possible-1027`。`xl_build` 0 error、`tsc` exit 0、目标矩阵 29 ok / 1 fallback / 0 diff / 0 error、5 smoke 判据与 T1 基线逐字节一致。合并提交 `24b0f4cb`。
