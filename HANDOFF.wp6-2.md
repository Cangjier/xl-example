# HANDOFF — impl-wp6-2（WP-6 第二波：module body / case / try / clause 接线）

STATUS: PARTIAL（树绿；module body 接线尝试后**按证据撤回**，见 §2）
BRANCH: impl-wp6-2 @ 9d4fd1f3 + 本包提交
BASE: refactor-integration @ 9d4fd1f3
父包: impl-wp6 @ 79b7ff3e（`HANDOFF.wp6.md` 的「未完成项 1–5」）

> **一句话**：module body 的「闭合括号 Data 上批处理」接线写了、跑死了（44 份 real-dts 崩溃、
> 13 条 AST 结构差），**按「未全绿则树必须绿」撤回**；本包交付的是
> ① 唯一可删的死文件已删、② try 三个块**已经在基线接线**的实测结论（`BuildBlock` 的 `DriveBodyItems`）、
> ③ 一次完整、可复现的接线实验与失败证据 + 下一步的精确修法。
> 树是绿的：AST `6167/6167 0/0/0`、real-dts `226/226`、`gates full -BaseBuild` **PASS**、buffer `4504/0/同错 52`。

## 1. 本包实际改了什么

| 改动 | 文件 | 说明 |
|---|---|---|
| 删除 | `typescript/tokens/declarations/case-block-possible-shape.xl.md` | `CaseBlockPossibleShape` 外部引用 = 0（全仓 grep 只剩自身与 `docs/refactor/file-inventory.md` 的清单行），纯 throw 桩。删后 xl_build 文件数 876 → 875，0 error |
| 新增 | `HANDOFF.wp6-2.md` | 本文件 |

**没有保留**的改动（已回滚，源码与 `9d4fd1f3` 逐字相同）：`module-block-shape.xl.md` 的
`FromBracket` 接管 + `DriveBodyItems`/`HasBuiltItems`/`BuildMemberAt` 覆盖校验。
回滚后的工具链读数见 §3。

## 2. module body 接线实验（已撤回，证据完整）

### 2.1 做法（照 `StatementBuilder.BuildBlock` 的现成口径，不改流式钩子）

1. `ModuleBlockShape.FromBracket` 里，在签入签出 / `Pos` 之后：
   ```ts
   if (bracket.BatchAdapter !== null) {
     bracket.FlushBatch(context);
   } else if (context.BatchMode !== 0 && !ModuleBlockShape.HasBuiltItems(bracket)) {
     ModuleBlockShape.DriveBodyItems(bracket, context);
   }
   ```
   `DriveBodyItems` = `new ModuleBodyItemHost(bracket, CreateBodyItemRules())` +
   `new BasicTokenBatch()` / `Reset(bracket, 0, true)` / `Sealed` / `Recompute` /
   `OnBasicTokens(batch, context)` / `CloseBatch(context)`（与 `BuildBlock.DriveBodyItems` 逐行同构）。
2. 收集循环改成 `BuildBlock` 的形态：非 basic、非 trivia 的单元 = item 建出的成员，
   `shape.Add(unit); inner.At++;`，其余仍 `BuildMember`。
3. `HasBuiltItems(bracket)`：`Data` 里已有非 basic 单元就跳过 Drive，避免候选重试对同一括号二次喂批。
4. **安全阀**：`BuildMemberAt(block, bracket, dataStart, dataEnd, context)` 建完后校验
   ① `member.SourceRange.EndIndex === bracket.Data[dataEnd].SourceRange.EndIndex`
   （成员恰好覆盖到 item 的最后一个代码单元）；
   ② `inner.At` 指向的下一个 unit 的宿主下标 `> dataEnd`（没有吞掉后面的 unit）。
   不满足返回 `null` → item 留 raw → 由 `BuildMember` 按原口径重建。

### 2.2 结果（本分支实测，`xl_build` 0 error、`tsc` exit 0）

| 门 | 读数 | 判定 |
|---|---|---|
| AST | 6167 条：完全一致 **6154**；**有结构差 13 条** | **RED**（基线 0 条） |
| real-dts | 226 份：**崩溃 44**（`表达式没有读完` ×43、`不支持的表达式起点` ×1） | **RED**（基线 0） |
| buffer | xml `PASS 4499 / FAIL 0 / ERROR 5`（基线 4504/0/0） | **RED** |
| batch-split | module 5 段 58 断言 PASS；statement 19 段 170 断言 PASS | 不受影响 |
| item-oracle | 89 段 / 451 前缀 PASS | 不受影响 |

回滚后同样的命令全部回到绿（§3），所以 **RED 是这次接线引入的，不是集成分支的既有问题**
（这也是本包顺带证实的一件事：`9d4fd1f3` 本身 0/0/0）。

### 2.3 失败机理（已定位到「边界语义」这一层，未定位到单个用例）

`表达式没有读完` 是 `ExpressionStatement` 从**本层 Units 末尾**建表达式时抛的：说明
`FromBracket` 的 legacy 循环被喂了一个**从语句中间开始**的 raw 片段。也就是说
**某个 item 的边界不是 `BuildMember` 会停下的那个边界**，而安全阀只校验了 item 的**右端**，
校验不了「这个 item 是不是从上一条的中间开始的」。

最可疑的一处是 `ModuleItemRule.Analyze` 的**两遍扫描**：

```ts
// 现在是：先扫完整段的第一个 ';'，再单独扫「换行处成员首词」
for (...) if (isSemicolon) { endAt = at; break; }
if (endAt < 0) for (...) if (memberStartWord && lineBreak) { endAt = at - 1; break; }
```

而 `ModuleBlockShape.BuildMember` 各分支（import / export / import= / type / export= 等）都是
**单遍交错**判定：每读一个 unit 先看 `;`、再看「换行处的下一个成员首词」。
两者在 `export { a } from "m"` ⏎ `let b = 1;` 这类输入上会给出不同的 `End`
（Analyze 取到 `let` 那条语句的 `;`，BuildMember 停在 `let` 前）——这次被安全阀挡下了（留 raw），
但同类差异会在别的形态上让前一条 item 的右端**越过**下一成员的起点，从而切出中间片段。

**结论：接线的前提是 `ModuleItemRule.Analyze` 与 `BuildMember` 的边界判据逐字同构**，
这件事不能靠「事后校验」补。

### 2.4 下一步（精确到改哪里）

1. **先把 `Analyze` 改成单遍交错**（`typescript/tokens/items/module-item-rule.xl.md`）：
   从 `at = 1` 起，一次循环里先判 `;`（含）、再判 `Common && IsMemberStartWord && !NoLineBreakBetween(code[at-1], unit)`（收在 `at - 1`）；
   第三证据（末单元是 `{ … }` 括号）保持。
   改完先只跑 `node tests/body-drive/batch-split.mjs --family module`，确认 5 段 / 58 断言仍 PASS。
2. **再把接线做成「全有或全无」**（`module-block-shape.xl.md`）：
   在**克隆括号**（`Data` 浅拷贝，token 同一批对象）上跑 `DriveBodyItems`；
   只有当克隆里**每个 item 都被安全阀接受、且没有 raw 残留**时，才把 `bracket.Data = 克隆.Data`；
   否则一个字节都不动、整段走 legacy。这样「边界不一致」不会切出中间片段。
3. 每步之后的最小回归集（都很快）：
   `node typescript/cases/real-dts-ast.mjs`（3 s，最先炸的就是它）→
   `node typescript/cases/ast-json.mjs` + `ast-json-diff.mjs`（2 s）→
   `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build`（44 s）。
4. 3 绿之后再动 case / try / clause。

## 3. 门禁读数（本分支实测，dist/build 均为本分支构建）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| B | `xl_build(core,typescript→dist)` + `tsc -p tsconfig.json` | 875 written / **0 error** / 2417 warning；tsc exit 0 | PASS |
| AST | `node typescript/cases/ast-json.mjs` / `ast-json-diff.mjs` | **6167/6167**；结构 0 / 位置 0 / 字段 0 | PASS |
| RD | `node typescript/cases/real-dts-ast.mjs` | **226/226**，崩溃 0，差异 0 | PASS |
| BD | `node tests/body-guide/harness.mjs --target=all --all` | interface 35/35、enum 46/46、class 54/54、util 10/10 | PASS |
| ORACLE | `node tests/body-drive/item-oracle.mjs` | 89 段 / 451 前缀，逐前缀 Status/End 一致 | PASS |
| SPLIT | `batch-split.mjs --family statement` / `--family module` | statement 19 段 170 断言；module 5 段 58 断言；各 0 失败 | PASS |
| BUF | `gates -Tier full -BaseBuild ..\baseline-build\build` 内 | xml **PASS 4504 / FAIL 0 / ERROR 0 / 同错 52**；digest 同（token 797790 = 基线） | PASS |
| F | `..\tools\gates.ps1 -Tier full -BaseBuild ..\baseline-build\build` | **RESULT: PASS**（44.0 s；唯一 RED* = KNOWN-RED `tests/gates/run.mjs` 1/8） | PASS |
| PERF | `node tests/bench/parse-perf.mjs --dts 8 --repeat 3` | TOTAL median **627.965 ms**（门限内；与基线同量级） | PASS |
| PERF-single | `node tests/bench/parse-perf.mjs --dts 1 --repeat 3` | `typescript.d.ts` median **94.377 ms**（样本 116.7 / 94.4 / 92.9）；`lib.dom.d.ts` 361.6 ms | 记录 |
| CLS | `class-scaling --rounds 15` + `--base` | 12 档 PASS；T=2000 median 8.14（x1.97）；XML 21/21 等价 | PASS |
| XLC | `xl_check(paths=[core,typescript], ignore W3102/W3103)` | 见下（删文件后） | 见下 |

`parse-perf` 的 `--dts 8` 与 `--dts 1` 两次的 TOTAL 不同（627.9 vs 593.4）：`--dts N` 是**取最大的 N 份**
而不是同一个清单，所以两次不可横向比；同一次运行内的 `typescript.d.ts` 中位数才是可比的记录值。

## 4. 其余三项的现状（原样交接，均**未接线**）

1. **try 的三个块：基线已经接线**（本包实测结论）。`BuildTry` / `BuildCatchClause` 的
   try、catch、finally 三个块都走 `this.BuildStatement()` → `BuildBlock`，而
   `BuildBlock` 在 `bracket.BatchAdapter === null && context.BatchMode !== 0` 时调
   `DriveBodyItems(bracket)`（`StatementBodyItemHost` + 全 Data 一批 + `CloseBatch`），
   `BatchMode` 默认 **1**。所以 `HANDOFF.wp6.md` §未完成项 3 的「三个块没有各自挂 Statements 表」
   **在当前集成基线上已不成立**；不需要新代码，只需要在 WP-6 的验收里把它算成已完成（并补一条
   try/catch/finally 的 batch-split 断言，如果要证据）。
2. **case block：仍未接线**。钩子在 `StatementBuilder.BuildCaseBlock`
   （`statement-builder.xl.md`，本包写范围内、但本包没动）。做法：把 clause 建造抽成
   `BuildClauseAt(bracket, dataStart)`（复用现在的 case/default 分支，判据一字不改），
   新增 `typescript/tokens/items/clause-item-rule.xl.md`（接口 `ClauseBuild { BuildAt(host, start, end, context) }`，
   仿 `ModuleMemberBuild` 避免 items ↔ shapese 循环依赖），`BuildCaseBlock` 里用
   `DriveCaseItems(bracket)` 喂一遍、再按 `BuildBlock` 的收集循环取子节点。
   **注意**：先按 §2.3 的教训把「clause 边界（下一个 case/default 关键字）」与建造器判据做成同一份。
3. **import/export clause 小表：仍未接线、`clause-item-rule.xl.md` 未创建**。
   `NamedImportsShape.FromBracket` / `NamedExportsShape.FromBracket` 在**已闭合**括号上一次性建
   specifier 列表，接线点只能是它们自己（`named-imports-shape.xl.md` / `named-exports-shape.xl.md`
   现在**已在本包写范围内**：任务书写范围含 `declarations/named-imports,named-exports`）。
   item = 一个 specifier（含 `,` 分隔符），建造入口直接复用现有的 specifier 建造；
   `import {a as b, type c}` / `export {x as "y"}` 的口径在 `FromBracket` 里一字不改，只换「分段来源」。

## 5. 未完成项与坑

- **module body 接线**（§2.4 三步）——本包最高优先级的遗留。
- case block / import-export clause 两族未接线（§4.2 / §4.3）。
- 坑（新增）：`ModuleBlockMemberBuild.Blocks` 以括号为 key 缓存 block，跨候选重试不释放；
  二次 `FromBracket` 必须用「Data 里已有非 basic 单元」判据跳过 Drive，否则规则会把形状单元当成员头。
- 坑（新增）：`ModuleItemRule.Classify` 对首单元是 `;` 的 item 返回 `[]`，`CurrentRule` 会一直保持
  `-1` 直到 `Flush`，于是「`;` 之后整段」都进 raw。行为安全（legacy 会重建），但会让 module 族的
  「建出 item 数」偏低；接线的覆盖率评估要算上这一点。
- 坑（继承）：`Array<int>` 不能写进局部变量注解；`batch-split` 的族参数是 `--family module`（空格）。
- 回滚用的补丁留在工作区（未提交）：`tmp-wp6-2-src.patch`（16.5 KB，module-block-shape 的全部改动）。
