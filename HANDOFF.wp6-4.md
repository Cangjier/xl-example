# HANDOFF — impl-wp6-4（WP-6.4：case block 接线，WP-6 最后一项）

STATUS: COMPLETE
BRANCH: impl-wp6-4 @ (见 git log)
BASE: refactor-integration @ 40729d95（已含 WP-6.3 的 module body + clause）
父包: impl-wp6 @ 79b7ff3e（`HANDOFF.wp6.md`）→ impl-wp6-3 @ 9fd797f5（`HANDOFF.wp6-3.md`）

> **一句话**：`StatementBuilder.BuildCaseBlock` 现在先把已闭合 case block 括号的 `Data` 交给
> 新的 `CaseClauseItemRule` 表（**克隆括号 + 全有或全无**），子句边界与 legacy 建造器**同一份判据**
> （抽出的 `BuildCaseClause`）；**AST 6167 `0/0/0`、real-dts 226/226、buffer 4504/0/0/52 字节相同、
> full -BaseBuild PASS**。case 语料 78 段 case block 全部接管、**0 fallback**。
> 顺带删掉 4 个零引用 case/switch possible 桩。WP-6 的 module body / clause / case block 三项全部完成
> （try 三块仍按任务书不在本包范围）。

## 1. 本包改了什么

| 改动 | 文件 | 说明 |
|---|---|---|
| 新增 | `typescript/tokens/items/case-clause-item-rule.xl.md` | case block item 表：`CaseClauseBuild` / `CaseClauseItemRule` / `CaseClauseItemHost` / `CaseClauseDrive`（与 `clause-item-rule` 同构） |
| 改 | `typescript/tokens/statements/statement-builder.xl.md` | `BuildCaseBlock` 接 item 表（`BatchMode !== 0` 时先驱动，接管成功直接用子句表，否则逐字走 legacy）；抽出 `BuildCaseClause`（legacy 与 item 两条路共用）、新增 `BuildCaseClauseAt`（一子句建造入口 + 右端安全阀）、`CaseClauseBuildAdapter` |
| 删 | `typescript/tokens/keywords/case-keyword-possible-shape.xl.md` | 零外部引用（全仓 grep 只剩自身 3 行）纯 throw 桩 |
| 删 | `typescript/tokens/keywords/switch-keyword-possible-shape.xl.md` | 同上 |
| 删 | `typescript/tokens/members/case-clause-possible-shape.xl.md` | 同上 |
| 删 | `typescript/tokens/members/default-clause-possible-shape.xl.md` | 同上 |
| 改 | `tests/body-drive/batch-split.mjs` | 新增 `case` 族（8 段语料 / 9 个 case block / 114 断言）；其余四族不变 |

xl 文件数 874 → **871**（-4 删 +1 新增）。
**没删** `typescript/tokens/statements/switch-statement-possible-shape.xl.md`：`source-file-shape.xl.md`
（`typescript/tokens/files/**`，不在写范围）仍 import 它，属于「非零引用」。

## 2. 接线做法（三条，与 HANDOFF.wp6-3 §5.2 的要求逐条对应）

1. **抽 `BuildCaseClause(inner)` 作为唯一分段判据**。原 `BuildCaseBlock` 的 case / default 两段循环
   原样搬进静态方法（三元深度 0 的 `:` 收尾标签那条注释一字未改），legacy 循环与 item 建造入口
   都只调它。因此「item 边界」与「建造器边界」不可能各写一份。
2. **case 边界与建造器同一份判据**：item = 一条子句。`CaseClauseItemRule` 维护标签状态
   （`InBody` / `TernaryDepth` / `BodyFrom`）：`?` 加深、配对的 `:` 减浅、深度 0 的 `:` 结束标签；
   **标签里的 `case` / `default` 不算边界**（`case a.default:` 这种形态由建造器的右端安全阀挡下，
   整段回退 legacy，不会切出半条子句）。体里出现 `case` / `default` 代码单元 ⇒ 下一条 item 从这里开始。
3. **段末用「宿主 `Data` 最后一个代码单元」而不是 `AtEof`**（`HostLastCode` 现算、与 `state.LastCode` 比对）。
   case block 是整批喂的，`AtEof` 在每个 unit 上都是 `true`；用它在第一条子句的第一个单元处就会收口。
   `batch-split --family case` 的 split 用例证明这条：切批后第一批的 `LastCode` 不是宿主末单元，不会提前收口。
4. **克隆 + 全有或全无**（`CaseClauseDrive.Drive`）：`new Bracket(Template)` + `Data.slice()` +
   `SourceRange.Clone()`，容器 `bracket.Data` 一个字节都不动。四条判据同时成立才接管：
   ① 驱动没抛异常；② 克隆里没有 raw 残留（非 trivia 单元全是 item 建出的形状）；
   ③ 每条子句过了 `BuildCaseClauseAt` 的右端安全阀
   （`clause.SourceRange.EndIndex === bracket.Data[end].SourceRange.EndIndex`，严格相等）；
   ④ `BuildCaseBlock` 只在 `BatchMode !== 0` 时驱动（`BatchMode === 0` 逐字走 legacy，buffer 等价的前提）。
   `BuildCaseClauseAt` 内部 `try/catch → null`：单条子句建不出只让**整段**回退，不会把异常甩到解析器。

### 2.1 实测 adoption

按 ast-json 的口径（一行一个用例）跑 `typescript/cases/**/*.ts`（6140 行解析成功）：

```
case block : adopt 78 / fallback 0 / clauses 94 / calls 78
```

**78 段 case block 全部接管、0 fallback**（每段切出的子句数与源码子句数一致：94 条）。
226 份 real-dts 里 **0 个 switch**（`.d.ts` 语料没有 case block，所以 real-dts 不覆盖这条路径——
覆盖它的是 AST 语料的 `statements.ts` / `labeled-statements.ts` / `end-build.ts` 等 6 个文件）。

AST 语料里这些形态**已经在接管路径上跑过并且 AST 一致**（不必再自己造用例）：
三元标签 `case a ? b : c:` / 嵌套三元 `case a ? b : c ? d : e:`、标签内注释
`case /* c */ a ? b : c /* c */ :`、`default` 不在末尾（`default: a(); case a ? b : c: b();`）、
空 switch（`switch (x) {}`）、fallthrough（`case a ? b : c: case d: e();`）。

## 3. 门禁读数（本分支实测，dist/build 均为本分支构建）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | **871** 文件 / 0 error / 2410 warning；tsc exit 0 | PASS |
| AST | `node typescript/cases/ast-json.mjs` + `ast-json-diff.mjs` | **6167/6167**；结构 0 / 位置 0 / 字段 0 | PASS |
| RD | `node typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 | PASS |
| BD | `tests/body-guide/harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 | PASS |
| ORACLE | `node tests/body-drive/item-oracle.mjs` | **91 段 / 450 前缀**，逐前缀 Status/End 一致 | PASS（见 §5.1） |
| SPLIT | `batch-split.mjs`（全族）/ `--family case` | 40 段 / 428 断言 0 失败；case 族 9 段 / 114 断言，建出 item 8 / 全 raw 1 | PASS |
| STREAM | `node tests/body-drive/stream-proof.mjs` | stream-vs-batch **92/92 PASS** | PASS |
| BUF | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；字节 34109694 = 基线；digest token **797790** = 基线 | PASS |
| F | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（45.1 s；唯一 RED* = KNOWN-RED `tests/gates/run.mjs` 1/8） | PASS |
| PERF | `parse-perf --dts 8 --repeat 3`（在 gates 内） | TOTAL median **605.172 ms**（WP-6-3 608.4，同量级） | PASS |
| CLS | class-scaling 12 档 + `--base` | 全 PASS；XML 等价 **21/21**，字节一致 | PASS |
| XLC | `xl_check(paths=[core,typescript], ignore W3102/W3103)` | **871 文件 / 0 error / 5 warning**（4 条是本次删文件的 cache 残留 E2004，1 条是既有的 E1107 撞名） | PASS |

## 4. 下一步的精确命令

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set
# 合并（merger 做，本包不 push）：
.\tools\new-member.ps1 -Name merge-wp6 -Base refactor-integration
cd merge-wp6
..\tools\fetch-branch.ps1 -From impl-wp6-4 -Branch impl-wp6-4
git merge --no-ff impl-wp6-4/impl-wp6-4 -m "merge WP-6.4 case block"
..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build
```
若还要继续做 WP-6 的残留项（try 三个块，本包范围外）：
```powershell
.\tools\new-member.ps1 -Name impl-wp6-5 -From impl-wp6-4 -Base impl-wp6-4
cd impl-wp6-5
# 改 statement-builder 的 BuildTry/BuildCatchClause：三块都从**已闭合**括号走
#   DriveBodyItems（StatementBodyItemHost 已在，复用现成规则表）→ xl_build → tsc → full
```

## 5. 需要下一波注意的四件事

1. **item-oracle 段数 88 → 91，不是回归**。`BuildCaseClauseAt` 对每条子句都 new 一个
   `StatementBuilder` 并 `Load(该子句的切片)`，oracle 挂在 `StatementBuilder.prototype.Load` 上，
   于是多出几条「子句切片」的捕获（按 `长度@起点` 去重后 +3）；前缀总数仍是 **450**（与 WP-6-3 相同），
   RESULT 仍 PASS。oracle 打印的「解析失败 #12」是它自己那份**故意非法**的恢复语料
   （`function m2() { let a = 1 let b = 2 ... }`），WP-6-3 起就在，不是本包引入的。
2. **`case a.default:` 这类形态会整段回退 legacy**。item 的边界判据不看标签表达式内部
   （`default` 在标签里出现就收口），此时 `BuildCaseClauseAt` 以 `null` 兜底、整段回退；
   `batch-split --family case` 的第 8 段（8 建出 / 1 全 raw）就是它，断言证明「不崩、不半接管」。
   想让接管率上去，要在 `Analyze` 里也做「标签未收尾时不认子句关键字」，不要放宽安全阀。
3. **`switch-statement-possible-shape.xl.md` 仍被 root import**（`source-file-shape.xl.md`），
   所以本包没删；`case-block-possible-shape` 已在 WP-6-2 删掉。剩下 4 个零引用 case/switch 桩本包已删。
4. **`dist/ts` 的 4 条 orphan 记录仍在 xl cache 里**（E2004 warning）：文件已删、产物已删，
   `xl orphans --prune` 只报「product already gone」并不清 cache。不影响 0 error，也不必再动。

## 6. 坑（新增）

- **item 规则不要用 `AtEof` 判段末**（WP-6-3 已记，本包验证同样适用于 case）：整批喂时 `AtEof` 恒 `true`。
- **`BuildAt` 内部必须 `try/catch → null`**：`BuildCaseClause` 对畸形切片会 throw（`case 缺少冒号` /
  `default 缺少冒号`），让它冒到 `Feed` 会把异常甩给解析器；`Drive` 的 try 只能兜整段，兜不到
  「这一条建不出但整段仍要优雅回退」的语义。
- **`tests/body-drive/batch-split.mjs` 里捕获 case block**：打桩的是
  `StatementBuilder.prototype.BuildCaseBlock`（实例方法），不是 `X.FromBracket`；桩里只 `push(bracket)`
  再 `call` 原实现即可——接线后容器 `bracket.Data` 不再被改写，可以安全地当 item 表宿主。
- **PowerShell 5.1 的 `Get-Content`/`Select-String` 行号在含中文的 `.ts` 上会对不上**
  （同一文件两个 cmdlet 给出的行号不同）；要看产物某段代码，用 `node -e` 读文件切片，别用 `Select-Object -Skip`。
- `.xl.md` 仍然只能 `write`/`edit` 工具写（UTF-8 no BOM）；`xl_build` 会打 2400+ 条 warning，
  合并命令时 `Select-Object -Last N`。

## 7. 阻塞点

无。xl_build / tsc / gates / baseline-build 全部可用；本包不 merge、不 push。
