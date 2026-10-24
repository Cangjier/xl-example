# HANDOFF — impl-wp6-3（WP-6 第三波：module body 接线 + import/export clause）

STATUS: DONE（module body 与 clause 都已接线，树绿；case block 按任务书留给下一波）
BRANCH: impl-wp6-3
BASE: impl-wp6-2 @ 82512563（`HANDOFF.wp6-2.md` 的「未完成项」第 1、3 条）
父包: impl-wp6 @ 79b7ff3e（`HANDOFF.wp6.md`）

> **一句话**：`ModuleItemRule.Analyze` 改成**单遍交错**（与 `BuildMember` 同一份边界判据），
> 模块体用「**克隆括号 + 全有或全无**」接线成功——real-dts 226/226（WP-6-2 是 44 份崩溃）、
> AST 6167 `0/0/0`、buffer 4504/0/0 与基线逐字节相同；`import { … }` / `export { … }` 用新的
> `clause-item-rule` 小表接线（239 段全 adoption、0 fallback）。case block 未做。

## 1. 本包改了什么

| 改动 | 文件 | 说明 |
|---|---|---|
| 改 | `typescript/tokens/items/module-item-rule.xl.md` | `Analyze` 两遍扫描 → **单遍交错**；接线状态的文档同步 |
| 改 | `typescript/tokens/declarations/module-block-shape.xl.md` | 新增 `DriveBodyItems`（克隆括号 + 全有或全无）；`FromBracket` 接管；`ModuleBlockMemberBuild.BuildAt` 安全阀改为**严格相等** |
| 新增 | `typescript/tokens/items/clause-item-rule.xl.md` | 子句 item 表：`ClauseBuild` / `ClauseItemRule` / `ClauseItemHost` / `ClauseItemDrive` |
| 改 | `typescript/tokens/declarations/named-imports-shape.xl.md` | `FromBracket` 接 item 表 + `ImportSpecifierClauseBuild`（`Pos` 表按原始 `Data` 预计算）；legacy 分组原样保留为回退 |
| 改 | `typescript/tokens/declarations/named-exports-shape.xl.md` | 同上：`ExportSpecifierClauseBuild` |
| 删 | `typescript/tokens/declarations/import-specifier-possible-shape.xl.md` | `ImportSpecifierPossibleShape` 外部引用 = 0（全仓 grep 只剩自身 3 行），纯 throw 桩 |
| 删 | `typescript/tokens/declarations/export-specifier-possible-shape.xl.md` | `ExportSpecifierPossibleShape` 同上 |
| 改 | `tests/body-drive/batch-split.mjs` | 新增 `clause` 族（6 段 / 72 断言）；`module` 族不变（容器 `Data` 自本包起不再被改写，捕获即原始单元） |

xl 文件数 875 → 874（-2 删 +1 新增）。

## 2. module body：为什么这次能接上（与 WP-6-2 的差别）

WP-6-2 的失败不是「接线点找错了」，而是**两条边界判据不一致 + 在容器上直接 splice**。
本包三条一起改：

1. **`Analyze` 单遍交错**（`module-item-rule.xl.md`）：每读一个 unit 先看 `;`（含），
   再看「换行处的下一个成员首词」（收在 `at - 1`，且 `at > 1`）。与 `BuildMember` 的
   variable / import / import= / export / export= / function 各分支的扫描循环**逐字同构**。
   原来的两遍扫描（先扫整段第一个 `;`，两遍都失败才看成员首词）在
   `export { a } from "m"` ⏎ `let b = 1;` 上会把 `End` 取到后一条语句的 `;`。
2. **在克隆括号上驱动**（`module-block-shape.xl.md` 的 `DriveBodyItems`）：`new Bracket(Template)` +
   `Data.slice()` + `SourceRange.Clone()`，`BasicTokenBatch.Reset(clone, 0, true)` / `Sealed` /
   `Recompute` / `OnBasicTokens` / `CloseBatch`（与 `StatementBuilder.DriveBodyItems` 逐行同构）。
   **容器 `bracket.Data` 一个字节都不动**——WP-6-2 直接在容器上 splice，第二次 `FromBracket`
   （候选重试）就把上一次建出的形状当成员头再建一遍，`BuildStatement` 从语句中间起表达式 →
   `表达式没有读完` / `不支持的表达式起点`。本包实测这条坑是真实的：先写成「容器上跑完再还原」
   的版本，仍然是 4 份崩溃（`typescript.d.ts` / `dns.d.ts` / `test.d.ts` / `buffer.buffer.d.ts`），
   换成克隆后归零。
3. **全有或全无**：接管 = ① 驱动没抛异常；② 克隆里没有 raw 残留（非 trivia 单元全是 item 建出的形状）；
   ③ `ModuleBlockMemberBuild.BuildAt` 的安全阀对**每个**成员要求
   `member.SourceRange.EndIndex === bracket.Data[end].SourceRange.EndIndex`（严格相等，不是 `<=`）。
   任何一条不成立 → 返回 `null` → `FromBracket` 逐字走 legacy 逐成员 `BuildMember`。
   严格相等顺带挡下 `class C {};`（空语句该是独立子节点）与 `export as namespace NN`（合成 `;`）这类
   「成员建得比 item 短」的形态。

`ModuleBlockMemberBuild.Blocks`（按括号缓存 `DataCursorAt`）在每次驱动后 `delete`：克隆是新的，
不清会一直增长；跨候选重试也不再残留游标。

### 2.1 实测 adoption（226 份 real-dts）

在 `ModuleBlockShape.DriveBodyItems` 上挂计数器跑全量 226 份：

```
module body : adopt 256 / fallback 101 / members 1878
```

即 **256 个模块体括号（72%）由 item 表接管**，101 个（`export as namespace` / 无分号 import= /
`class {};` 这类边界不一致的形态）整段走 legacy。fallback 是安全路径，不是失败。

## 3. import/export clause：新小表 + 全有或全无

`clause-item-rule.xl.md`：item = **一个 specifier（含它的 `,`）**。分隔符必须属于某条 item，
否则 `,` 会以「首单元不认领」的形态卡在两次 item 之间、`CurrentRule` 一直停在 `-1`，
后面整段进 raw（`ModuleItemRule` 对 `;` 的注释记着同一个坑）。

- `Analyze`：`;` 之外的收口只有两种——显式 `,`（含），或「已读到宿主 `Data` 的最后一个代码单元」
  （`HostLastCode` 现算 + `state.LastCode` 比对）。**不能用 `AtEof`**：子句是整批喂的，
  `AtEof` 在这批每个 unit 上都是 `true`，用它会在每条 specifier 的第一个单元处收口
  （第一版就是这样，`export { dnsPromises as promises }` 被切成 3 条 specifier，8 份 real-dts 出结构差）。
  现算而不是预存下标，是为了**分批喂**也能用（前一批 splice 过后预存下标会失效）。
- `ClauseItemDrive.Drive`：克隆括号 + 三条判据（异常 / 无 raw 残留 / 由 `BuildAt` 建的形状），
  与 `ModuleBlockShape.DriveBodyItems` 同一套。
- `Pos` 口径不变：每个 specifier 的 `Pos` 是它前面那个非 trivia 单元（`{` 或 `,`）的 `EndIndex`。
  因为驱动时引擎会 splice 克隆的 `Data`，`ImportSpecifierClauseBuild` / `ExportSpecifierClauseBuild`
  在**原始** `Data` 上预计算 `Map<Token,int>`（`Positions`），`BuildAt` 查表。
- `{a as b, type c}` / `{x as "y"}` 的判型仍在 `FromTokens` 里，一个字没改；两种路径只在
  「分段来源」上不同。

### 3.1 实测 adoption（226 份 real-dts）

```
clause : adopt 239 / fallback 0 / specifiers 618
```

**全部 239 段子句都走 item 表**，0 fallback。

## 4. 门禁读数（本分支实测，dist/build 均为本分支构建）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | 874 文件 / **0 error** / 2418 warning；tsc exit 0 | PASS |
| AST | `node typescript/cases/ast-json.mjs` + `ast-json-diff.mjs` | **6167/6167**；结构 0 / 位置 0 / 字段 0 | PASS |
| RD | `node typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 | PASS |
| BD | `tests/body-guide/harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 | PASS |
| ORACLE | `node tests/body-drive/item-oracle.mjs` | **88 段 / 450 前缀**，逐前缀 Status/End 一致 | PASS（见 §5 注） |
| SPLIT | `batch-split.mjs --family module` / `--family clause` | module 5 段 58 断言；clause 6 段 72 断言；各 0 失败 | PASS |
| STREAM | `node tests/body-drive/stream-proof.mjs` | stream-vs-batch 92/92 PASS | PASS |
| BUF | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；digest token 797790 = 基线 | PASS |
| F | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（46.2 s；唯一 RED* = KNOWN-RED `tests/gates/run.mjs` 1/8） | PASS |
| PERF | `parse-perf --dts 8 --repeat 3`（在 gates 内） | TOTAL median **608.435 ms**（与 WP-6-2 的 627.9 同量级） | PASS |
| CLS | class-scaling 12 档 + `--base` | 全 PASS；XML 21/21 等价 | PASS |
| XLC | `xl_check(paths=[core,typescript], ignore W3102/W3103)` | **874 文件 / 0 error / 3 warning**（2 条是本次删文件的 cache 残留 E2004，1 条是既有的 E1107 撞名） | PASS |

## 5. 需要下一波注意的三件事

1. **item-oracle 的段数从 89 变 88（前缀 451 → 450），不是回归**。oracle 挂在
   `StatementBuilder.prototype.Load` 上抓「代码段」，按 `(长度@起点)` 去重。模块体接线前，
   `ModuleBlockShape.FromBracket` 的 legacy 路径会对整个模块体 `inner.Load(bracket.Data, base)`
   一次；接管后这个 Load 不再发生（子节点由 item 建出），于是少了一个「模块体整段」的捕获。
   ORACLE 仍然 PASS（逐前缀 Status/End 与 oracle 一致）。要恢复段数，得让 oracle 也走一次
   `BuildMemberAt` 的 Load 或换去重键——那是 oracle 自己的事，不要为此改回 legacy。
2. **case block 仍未接线**（任务书要求本波不做，与 impl-wp3-13 的 statement-builder 改动冲突）。
   下一波按 `HANDOFF.wp6.md` §未完成项 2 + `HANDOFF.wp6-2.md` §4.2 做：把 clause 建造抽成
   `BuildClauseAt(bracket, dataStart)`，新增 case 版 item 规则（边界 = 下一个 `case` / `default`
   关键字，与建造器**同一份判据**），`BuildCaseBlock` 里 `DriveCaseItems` + `BuildBlock` 的收集循环。
   **先按本节 §3 的教训**：段末不能用 `AtEof`，要用「宿主 `Data` 的最后一个代码单元」现算；
   且必须在克隆括号上驱动、全有或全无。
3. **`export as namespace` / 无分号 `import x = require(...)` / `class {};` 仍走 legacy**
   （adoption 剩下的 101 段主要就是它们）。想让接管率上去，要改的是
   `ModuleItemRule.Analyze` 与 `BuildMember` 的**同一份**判据（例如把 `as` / `import=` 的合成 `;`
   口径也写进 `Analyze`），而不是放宽安全阀。

## 6. 坑（新增）

- `.xl.md` 只能 `write`/`edit` 工具或 `WriteAllText` + UTF8 **no BOM**；PowerShell 5.1 的
  `Set-Content -Encoding utf8NoBOM` **不存在**（枚举里没有这个值），别用它批改。
- `new Map<Token, int>()` 的泛型实参不会被 xl 翻译（产物里字面留 `int`，tsc 报
  `Cannot find name 'int'`）；写 `new Map()`，类型注解照写 `Map<Token, int>`。
- `ast-json.mjs` 会重写 snapshots，跑完必须 `git checkout -- typescript/cases`。
- `xl_build` 每次会把 2400+ 条 warning 全打出来，输出很长；合并命令时留 `-Last N`。
- 删 `.xl.md` 后 `dist/ts/**.ts` 会留成 orphan（E2004 warning）：手工删产物再跑一次
  `xl_build`；`xl_orphans prune` 只清 cache 记录，不删盘上文件。
