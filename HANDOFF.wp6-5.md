# HANDOFF — impl-wp6-5（WP-6 收官：try / catch / finally 三块的批处理验收）

STATUS: DONE（**无需改源码**：try 三块在基线已由 `StatementBodyItemHost` 驱动；本包只补显式验收）
BRANCH: impl-wp6-5
BASE: refactor-integration @ ccfe4039
父包: impl-wp6-2（`HANDOFF.wp6-2.md` §4.1「try 三块基线已接线」的实测结论）

> **一句话**：`BuildTry → BuildStatement → BuildBlock` 这条链对 try / catch / finally 三个块全部成立：
> 流式路径在 `{` 创建时挂 `StatementBodyItemHost`（`try` / `finally` / `catch (…)` 都在
> `StatementBlockStream` 白名单里），非流式路径由 `BuildBlock` 调 `DriveBodyItems`——**两条路同一套
> item 表**。本包用新的 `batch-split --family try`（21 段 / 283 断言）与 stream-proof 追加段
> （try 族整树 XML 等价）把它钉成显式验收；**没有改任何 `typescript/**` 源码**（`BuildTry` 未动）。
> 门禁：AST 6167 `0/0/0`、real-dts 226/226、`gates full -BaseBuild` **PASS**（buffer 4504/0/52）、
> batch-split 全族 PASS（61 段 / 711 断言）、stream-proof 146/0、xl_check 0 error。

## 1. try 三块走 batch 的证据（计数）

### 1.1 代码路径（`typescript/tokens/statements/statement-builder.xl.md`）

- `BuildStatement` 对 `{` 分支 → `BuildBlock`（`statement-builder.xl.md:234`）。
- `BuildTry`：`this.BuildStatement()` 建 try 块，`BuildCatchClause()` 建 catch（其块体同样
  `BuildStatement` → `BuildBlock`），`finally` 也是 `BuildStatement`。
- `BuildBlock` 两条路（`:1242`）：
  - `bracket.BatchAdapter !== null` → `FlushBatch`（`StatementBlockStream` 在 `{` 创建时挂的宿主，
    item 解析期建出）；
  - 否则 `BatchMode !== 0` → `DriveBodyItems(bracket)`（`StatementBodyItemHost` + 全 Data 一批 + `CloseBatch`）。
- `BatchMode` 默认 **1**（`core/syntax/syntax-context.xl.md:47`）；`StatementBlockStream` 白名单含
  `try` / `finally`，`catch (e) {` 经由前缀 `)`（`:161`、`:165`）。

### 1.2 本包语料（`batch-split --family try`，21 段）

捕获方式：`StatementBlockStream.Enabled = false` 后解析，在 `BuildBlock` 入口取 `bracket.Data` 的
**原始**副本（`DriveBodyItems` 的 splice 发生在这次调用内），并给 `DriveBodyItems` 挂计数。

| 读数 | 值 |
|---|---|
| try 族块捕获 | **21**（try 9 / catch 6 / finally 6） |
| 非流式路径 `DriveBodyItems` 为 try 族块调用 | **21**（每个块都走 `BuildBlock → DriveBodyItems`） |
| 流式挂载 | **20**（try 9 / catch 5 / finally 6）；`catch {`（可选绑定）**不挂**（白名单只认 `catch (…)` 的 `)`），走 legacy，行为等价 |
| 挂载适配器类型 | 20/20 = `StatementBodyItemHost` |
| 流式解析期建出 item | 18 个（16 个块整块建成 item；2 个空块 0 item；2 个表达式块整块 raw；partial 0） |
| 整批手动驱动（同一套 rules） | item **18** / raw 残留 6 / 空块 3 / 整段回退 2 |

### 1.3 真实语料（`tests/cases` 中 847 份含 `try {` 的 .ts）

流式路径逐文件解析，并做「流式 vs 关闭流式（`DriveBodyItems` 路径）整树 XML」对比：

```
files=847 errors=1 stream-vs-batch XML mismatch=0
mounted: try=883 catch=832 finally=59
bodies : built(items>0,raw=0)=94 rawOnly=1652 partial=28 items=128 rawLeft=12412
```

- **挂载是全覆盖的**：883 个 try、59 个 finally、832 个 `catch (…)` 全部挂上 `StatementBodyItemHost`。
- **整树 XML 0 差异**：流式路径与 `DriveBodyItems` 路径对 847 份真实含 try 文件逐字节一致。
- `rawOnly` 高（1652/1774）不是 try 的问题：块体只有表达式语句（`try { g(); }`）时
  `StatementItemScan` 返回 Mismatch、整块留 raw —— 与 stream-proof 已有的「已知边界」同一条
  （`statement-item-rule` 的 `Classify` 不认领表达式起头语句）。
- `partial=28` 是 `BuildBlock` 注释里写明的「残留 basic 区间仍走逐条 BuildStatement」的**逐区间**
  回退，不是块级半成品；因此**不能**把「全有或全无」当成对任意真实代码的块级断言
  （本包只在受控语料上断言它，见 §2）。

## 2. 本包改了什么

| 改动 | 文件 | 说明 |
|---|---|---|
| 改 | `tests/body-drive/batch-split.mjs` | 新增 **try 族**（21 段语料 / 283 断言）：`try{}finally{}`、`try{}catch{}`、`try{}catch{}finally{}`、嵌套 try、`catch (e: any)`、空块、表达式块整段回退；断言整批 vs 切点等价 + 全有或全无 + 三个块的挂载/建出/`DriveBodyItems` 计数；骨架只加了一个可选 `family.verify()` 钩子（按条计进 checks） |
| 改 | `tests/body-drive/stream-proof.mjs` | **追加第六段**（不改原有 5 段）：6 个 try/catch/finally 用例，断言 `try` / `finally` / `catch (…)` 块全部挂 `StatementBodyItemHost`、块内 item 解析期建出、空块 0 item，且流式 vs 闭合后批处理的**整树 XML 逐字节一致** |
| 新增 | `HANDOFF.wp6-5.md` | 本文件 |

**没有改** `typescript/**`（`BuildTry` 一字未动）：基线已经满足验收，任务书 §4 的「最小接线」不成立。
**未新增** 其它测试文件；`item-oracle.mjs` 未改（读数变化见 §4）。

## 3. 门禁读数（本分支实测，dist/build 均为本分支构建）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | 871 文件 / **0 error** / 2406 warning；tsc exit 0 | PASS |
| AST | `node typescript/cases/ast-json.mjs` + `ast-json-diff.mjs` | **6167/6167**；结构 0 / 位置 0 / 字段 0 | PASS |
| RD | `node typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 | PASS |
| BD | `tests/body-guide/harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 | PASS |
| ORACLE | `node tests/body-drive/item-oracle.mjs` | **91 段 / 450 前缀**，逐前缀 Status/End 一致（见 §4 注） | PASS |
| SPLIT | `node tests/body-drive/batch-split.mjs`（全族） | statement 20 / module 5 / clause 6 / case 9 / **try 21** 段；**711 断言 / 0 失败** | PASS |
| STREAM | `node tests/body-drive/stream-proof.mjs` | **146 / 0**（原 5 段 + 新 try 段 6 用例） | PASS |
| BUF | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；digest 同；token **797790 = 基线** | PASS |
| F | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（45.5 s；唯一 RED* = KNOWN-RED `tests/gates/run.mjs` 1/8） | PASS |
| PERF | 同上内嵌 `parse-perf --dts 8` | TOTAL median 584.7 ms（与 WP-6-3 的 608 同量级） | PASS |
| CLS | class-scaling 12 档 + `--base` | 全 PASS；XML 21/21 等价 | PASS |
| XLC | `xl_check(paths=[core,typescript], targets=[ts])` | **871 文件 / 0 error / 2406 warning** | PASS |

## 4. 需要下一波注意的三件事

1. **`catch {`（可选绑定）不流式**：白名单只含 `try` / `finally` 与 `catch (…)` 的 `)`，`catch {`
   直接 legacy。行为等价（本次 847 份语料 0 XML 差异），若要 100% 挂载，改的是
   `typescript/run/statement-block-stream.xl.md` 的 `HasStatementPrefix` 白名单（不在 WP-6-5 写范围）。
2. **表达式起头语句的整块 raw 回退是 try 覆盖率的真实上限**：847 份含 try 文件里 1652/1774 个块体
   是 `try { g(); }` 这类表达式块，全部留 raw。这是 `StatementItemScan` 的既知边界，不是 try 特例；
   提高接管率要动 item 规则对表达式语句的判据（新 WP，不是 WP-6）。
3. **`item-oracle` 段数 91（WP-6-2 记 89、WP-6-3 记 88）不是本包改的**：oracle 未改，本包也没有
   解析时挂 Load 计数（try 捕获在 `BuildBlock` 上）；集成分支合入 case/module 后的 Load 捕获数本来
   就与那两个分支不同。ORACLE 仍 PASS（逐前缀 Status/End 全一致），以 PASS 为准。

## 5. 未完成项与下一步

- WP-6 的 try 验收**已完成**：无源码接线、无遗留缺陷。
- 本波**临时探针** `tmp-wp6-5-try-probe.mjs`（挂载/建出/DriveBodyItems 计数 + 847 份语料
  流式 vs 批处理 XML 对比）用完已删；读数都记在 §1.2 / §1.3，重跑办法：按 §1.2 的捕获方式
  在 `batch-split` try 族里加 `--verbose`，或恢复探针脚本。
- 下一步只在有需求时做：① `catch {` 白名单（`statement-block-stream.xl.md`）；
  ② 表达式语句的 item 判据（`statement-item-rule.xl.md` 的 `Classify`）。
- 不 merge、不 push；合并由 merger 按 `-BaseBuild` full 门禁执行。
