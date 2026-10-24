# HANDOFF — impl-wp3（WP-3：根级 source-file item 表 + tail builder）

STATUS: PARTIAL
BRANCH: impl-wp3 @ <本提交 sha 见 git log>
BASE: impl-wp2-4 @ 9da4efe7（含 WP-1 enum 试点 + WP-2 语句规则 / 块表接线）

## 做了什么

1. **建 clone**：`C:\Users\Admin\Documents\GitHub\xl-example-set\impl-wp3`，
   `.\tools\new-member.ps1 -Name impl-wp3 -From impl-wp2-4 -Base impl-wp2-4`，node_modules junction OK。
2. **tail builder 机械搬迁（PLAN §4 U4 的第一动作，已完成并验证逐字节等价）**
   - 新 `typescript/tokens/items/source-file-tail-builder.xl.md`：由
     `typescript/tokens/files/source-file-end-possible-shape.xl.md` **整文件复制**后只做一处机械替换
     （`SourceFileEndPossibleShape` → `SourceFileTailBuilder`，共 19 处引用点，逻辑一字未改；
     相对 import 路径 `../declarations/**`、`../../../core/**` 在新位置仍然正确，无需改）。
   - 三个建造入口按 U4 提升为 **public static**（原为 `private static`）：
     `BuildTrailingDeclaration(host,start,at,ctx):bool`、`BuildStatementSegments(host,start,at,ctx):bool`、
     `BuildModuleDeclaration(host,start,at,ctx):Token`。类头写入 WP-3 迁移状态说明
     （暂时仍 `extends PossibleShape`，`ComputeByIndex`/`BuildByIndex` 是旧协议外壳，行为不变）。
   - `typescript/tokens/files/source-file-shape.xl.md`：import 与 `new SourceFileTailBuilder()` 改指新文件；
     文档里两处 `SourceFileEndPossibleShape` 字样同步更新。
   - 删除：`typescript/tokens/files/source-file-end-possible-shape.xl.md`（1521 行原文件）、
     `typescript/tokens/files/source-file-possible-shape.xl.md`（throw 桩，全仓零引用）、
     `typescript/tokens/files/bundle-possible-shape.xl.md`（throw 桩，全仓零引用）。
     `typescript/tokens/files/` 现在只剩 `source-file-shape.xl.md`、`bundle-shape.xl.md`。
3. **消 `SourceFileShape.Close` 的三次全扫**（`typescript/tokens/files/source-file-shape.xl.md`）
   - 原实现：`this.Data.slice()` 快照扫 → 再扫一遍 → 校验扫（三次全扫 + 每文件一次数组分配）。
   - 现在：**单次 live 下标遍历**，每格最多 `TryToClose` 两次（与原「两轮」等价），仍关不掉即抛
     `SourceFileShape.Close: 有子单元无法关闭`；关闭过程中若该格被替换成新单元则不前进、下一轮再查。
   - 保留末尾 `this.Data.filter(...)`（AST 只留子形状，必须重建数组）。

## 门禁读数（本分支实测）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| xl_build | `xl_build(cwd=clone, paths=["core","typescript"], targets=["ts"], out="dist")` | **884 written / 0 error / 2429 warning**（起点 886/0/2435；少的 2 个文件＝删掉的两个 throw 桩，warning 差 6） | 绿 |
| tsc | `node .\node_modules\typescript\bin\tsc -p tsconfig.json` | exit 0 | 绿 |
| quick | `..\tools\gates.ps1 -Tier quick` | **PASS 5.6s**（tsc 3.97 / ast 0.92 / ast-diff 0.17 / body-guide 0.57） | 绿 |
| AST 全量 | `node .\typescript\cases\ast-json.mjs` → `ast-json-diff.mjs` | **6167/6167（47 构造）**，结构 0 / 位置 0 / 字段 0 | 绿 |
| AST 子集 | `ast-json.mjs expression statements members` + diff | 1214/1214，0/0/0 | 绿 |
| real-dts | 未在本波跑（轮次用尽） | — | 待跑 |
| full -BaseBuild | 未在本波跑（轮次用尽） | — | 待跑 |
| xl_check | 未在本波跑 | — | 待跑 |
| batch-split root | 未做（`RootItemRule` 未落盘） | — | 未开始 |

> `ast-json.mjs` 会重写 `typescript/cases` 快照：本波跑完已执行 `git checkout -- typescript/cases`。

## 未完成项（逐条，带精确下一步）

### 1. `typescript/tokens/items/root-item-rule.xl.md` 尚未创建（本波最大缺口）

**为什么停**：root 的建造面不是「一组对称的建造器」，而是 `SourceFileShape.CreatePossibleShapes()`
里那 30 个 possible shape 的 `BuildByIndex` 分派 + `SourceFileTailBuilder.BuildByIndex` 的尾巴兜底；
要把它们收敛成 `RootItemRule`，必须先把 `SourceFileTailBuilder` 的三个入口从
**「自己 splice `host.Data`」** 改成 **「只返回 Token，splice 交给引擎」**，否则 `ItemRule.Build`
与 `ItemListEngine.ApplyBuilds` 会双重 splice（INV-3/INV-7 冲突）。这一步没有做，因此
**没有新增 `root-item-rule.xl.md`、也没有把 `SourceFileShape.BatchAdapter` 接上**（保持 `null`，
`BatchMode=0/1` 下 root 仍逐字走 legacy possible 路径，AST 因此必然不变）。

**精确下一步（建议按顺序）**：

1. 先读 `typescript/tokens/items/source-file-tail-builder.xl.md` 的
   `BuildTrailingDeclaration`（现 429–1486 行）与 `BuildStatementSegments`（335–403 行）里**所有**
   `host.Data.splice(...)` / `host.Data.indexOf(...)` 调用点（约 20 处），把每个
   `xxx(host, start, at, ctx)` 拆成 `BuildXxx(...):Token | null`（**不 splice**）+ 现有调用方保留 splice：
   即「建造」与「落盘」分离，落盘只在 legacy `BuildByIndex` 里做。这一步能逐条对拍（旧调用点行为不变）。
2. 新建 `typescript/tokens/items/root-item-rule.xl.md`：
   - `class RootItemRule implements ItemRule`，kind 号按族分配（import=1 / export=2 / declaration=3 /
     module=4 / statement=5），`Classify` 读首 unit 文本（`Common.TempToString()`）→ 组；
   - `Analyze` 对 statement 组**复用** `StatementItemScan`（`items/statement-item-scan.xl.md`，禁止复制判据，
     INV-2），对声明组复用 `SourceFileTailBuilder.LeadingDeclarationKeyword` / `BodyDeclarationKeyword`
     这两个**已有**判据（`items/source-file-tail-builder.xl.md:158/183`）；
   - `Build` 调第 1 步拆出的 `Build*Item(...)`，返回 Token（不改 `host.Data`）；
   - `class SourceFileBodyItemHost implements IBatchHost`：照抄
     `StatementBodyItemHost`（`items/statement-item-rule.xl.md:134-236`）的形状，
     多一个 `Fallback:RawFallback` 与 `CloseBatch → Engine.Flush`；root 的 raw 回退**没有** legacy 建造器可交，
     所以 `Build` 返回 `null` 时必须由 `RawFallback` 之外的一条路径处理（`BuildStatementSegments` 兜底），
     这一条要在接线前想清楚。
3. `SourceFileShape` 构造器末尾加 `this.BatchAdapter = new SourceFileBodyItemHost(this, RootItemRule.CreateRules())`
   （`BatchMode=0` 由 `UnitToken.OnBasicTokenClosed` 自动回 legacy），然后才删 `CreatePossibleShapes` 与
   `CatalogGuide`；**先跑这一条**再看 `ast-json-diff`，红了就摘掉 BatchAdapter 回退（per-host 并存）。
4. EOF 显式收口：`SourceFileShape.Process` 的 EOF 分支（`source-file-shape.xl.md:117-136`）里
   `this.FlushBatch(context)` 已可用（`UnitToken.FlushBatch`），`batch.AtEof` 由
   `OnBasicTokenClosed` 每批写入；需要把「造 EOF 哨兵 → 关根」改成「先 FlushBatch 再关根」。

### 2. `tests/body-drive/batch-split.mjs` 的 root family 未加

依赖 §1 的 `RootItemRule` + host，现在加只能测不存在的规则。加的时候只动自己 family 段
（文件由 WP-2 建，merger 处理冲突）。参考 `--family=statements` 的写法：解析一段 root 级语料，
按 `engine.Feed` 的批次切分点比对「形状序列 + XML digest + 形状数」。

### 3. `parse-perf --repeat 5` ×3 中位 ≤565 ms、`BUF 4504/0/52`、`RD 226/226` 未测

本波的改动（tail builder 搬家 + Close 单次扫）预期只快不慢，但**没有读数就不许声称**。
接手后第一件事：`..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build`。

## 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
.\tools\new-member.ps1 -Name impl-wp3-2 -From impl-wp3 -Base impl-wp3
cd impl-wp3-2
# 0) 起点自检（本波已绿，应当直接过）
#    xl_build(cwd=<clone>, paths=["core","typescript"], targets=["ts"], out="dist")
node .\node_modules\typescript\bin\tsc -p tsconfig.json
..\tools\gates.ps1 -Tier quick
node .\typescript\cases\ast-json.mjs; node .\typescript\cases\ast-json-diff.mjs; git checkout -- typescript\cases
node .\typescript\cases\real-dts-ast.mjs                  # 期望 226/226
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build   # 期望 PASS
# 1) 拆 tail builder 的三入口为「只建造不落盘」（见未完成项 §1 步 1）→ xl_build → AST → commit
# 2) 新建 root-item-rule.xl.md（§1 步 2）→ xl_build → AST → commit
# 3) SourceFileShape 挂 BatchAdapter（§1 步 3）→ AST 全量 → 红了就摘 → commit
# 4) batch-split --family=root（§2）
```

## 阻塞点

无外部阻塞。本波**没有**改 `core/**`、`typescript/tokens/statements/**`、
`typescript/tokens/declarations/**`、`typescript/tokens/members/**`、`tools/**`、`TEAM.md`；
没有 merge、没有 push。

> 与 impl-wp2-5（core 钩子 + 语句块流式挂载）的接口：本波**未接线**，因此两侧目前零冲突。
> 接手者接线时只依赖 `IBatchHost` / `BasicTokenBatch` 两个 core 契约（WP-0 冻结），
> 不要改 `core/syntax/batch/**`、`bracket.xl.md`、`statements/**`。

## 踩过的坑（让接任者少花一轮的事）

- **1251 行的 possible shape 不要用 `write` 重打**：用
  `[System.IO.File]::ReadAllText` + `.Replace('SourceFileEndPossibleShape','SourceFileTailBuilder')`
  + `WriteAllText(..., UTF8Encoding($false))` 复制后原地改名，等价性最好证明；`xl_build` 的 warning
  计数（2435→2429，差 6＝删掉的两个桩文件的 W3102/W3103）就是搬家成功的侧证。
- **`edit` 工具在「文件刚被脚本改过」时会报 `file changed since it was read`**：先用 `read`
  重新读一次，或者干脆继续用脚本做文本替换（本波后半段都是脚本改的）。
- **`xl_build` 全量日志 ~370KB**：`select-object -last 25` 或 `paths=["typescript"]` 增量，别让日志淹没上下文。
- **`SourceFileShape.Close` 的两轮语义**：原实现第一轮遍历的是 `slice()` 快照，第二轮才是 live；
  合并成单次循环时必须保留「每格两次尝试」，并且**替换检测**（`this.Data[index] !== item` 就不前进），
  否则 `TryToClose` 里 splice 掉当前格会漏关它后面拼进来的单元。
- `Get-Content` 读中文 `.xl.md` 显示乱码是控制台编码问题；判据只看 `xl_build` 是否 0 error。
