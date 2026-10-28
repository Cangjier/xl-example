# IMPORTANCE 设计偏离审计（2026-10-28）

## 0. 这份文档是什么

以 [`docs/IMPORTANCE.md`](../IMPORTANCE.md) 为唯一判据，把本仓 `core/` 与 `typescript/` 下的 **638 个 `*.xl.md`** 逐个文件过一遍，记录「代码与设计不一致」的地方，最后按类别归纳。

- **只读审计**：没有修改任何 `*.xl.md`、没有修改 `IMPORTANCE.md`、没有跑 gates（用户明确要求忽略 gates 验证）。
- **判定全部来自源码**：每条结论都带 `文件:行号` 与关键片段；行号以 `read` 工具返回的行号为准。
- **不修代码**：本目录只产出「偏离梳理」，修复是另一件事。

## 1. 审计口径

### 1.1 为什么审计的是 `*.xl.md`

`*.xl.md` 是本仓的**唯一事实来源**：`dist/ts/**/*.ts` 与 `build/ts/**/*.js` 都是它的生成物（`xl build` → `tsc`），已被 `.gitignore` 忽略。方法体就写在每个 `## method` 后面的 ```ts 围栏里。所以「代码」= `*.xl.md`。

### 1.2 范围

| 目录 | 文件数 | 字节 | 说明 |
| --- | --- | --- | --- |
| `core/` | 53 | 160K | 语言无关层：token/catalog/cache/possible/shape/basic token/模板/异常 |
| `typescript/tokens/` | 566 | 2.76M | TS 语法层：statements / declarations / expressions / types / direct / files / keywords / punctuation / jsdoc / jsx / literals / members / bindings / trivia / synthetic / aliases / names / positions |
| `typescript/run/` | 5 | 21K | 驱动层：runner / document / 模板 |
| `typescript/ast/` | 13 | 4.9K | AST 节点规范（纯数据） |
| `cjcli.xl.md` | 1 | 3K | 根入口 |
| **合计** | **638** | **2 954 601 B / 58 559 代码行** | |

不含 `tests/`、`samples/`、`tmp/`、`dist/`、`build/`（其中 `tests/gates` 按用户要求整体忽略）。

### 1.3 判据

把 IMPORTANCE 拆成 36 条可对照的判据 `R01…R36`，并定义偏离编号 `S1…D1`，见 [`01-rules.md`](01-rules.md)。**每篇区域文档都只用这套编号**，所以跨篇可加总。

### 1.4 机械事实（可复算）

`_facts/` 下是按目录生成的机械扫描表（每个文件的类/基类/方法、是否覆盖 `ExitOrPre`/`ComputePossibleShapes`/`Process`、compute/build 里的 `catch`、`for/while`、`tokenIndex+N` 预读、cache 的 get/set/share、`Data.splice`、`MountedUnit=`、`Scan*`、`GetRaw`…）。生成脚本是 `docs/importance-1028/_tools/importance-scan.mjs`（在仓库根运行）。

全局读数（供下面的分类与结论引用）：

| 读数 | 值 | 对应判据 |
| --- | --- | --- |
| 文件数 / 字节 / 代码行 | 638 / 2 954 601 / 58 559 | — |
| 散文文件（围栏外说明文字） | **0** | R01 → `D1` 无 |
| shape 类文件 | 506 | — |
| 覆盖 `ExitOrPre` 的文件 | **24**（其中 TS shape 16 个） | R33 → `R1` |
| 覆盖 `ComputePossibleShapes` 的文件 | **18**（其中 TS shape 16 个） | R34 → `R2` |
| 覆盖 `Process` 的文件 | 10 | 设计外驱动 → `X1` |
| `HandleCloseDispatch` 引用 | **0** | R15/R16 → `P4` |
| `Reclose` 调用点 | **0** | R17③ → `P4`/`U2` |
| `ParseFromShape` 引用 | **1**（且只在 AST 节点文件的注释里） | R21 → `S4` |
| `ReloadMessage` 引用点 | 21 | R17④（有落地） |
| `MountedUnit` 赋值点 | 120 | R32（挂载是主流做法） |
| `TryToClose` / `SignOut` 调用点 | 309 / 208 | R31 |
| `catch` 总数 | 133；其中 compute/build 内 7 个文件（compute 4 次、build 9 次） | R23 → `B2` |
| compute 内出现循环的文件 | 33（65 处） | R08 → `C1` |
| compute 内预读 `tokenIndex+N` 的文件 | 34 | R22 → `B4` |
| 用 possible cache 的文件 | 46（`GetState` 99 / `SetState` 36 / `GetShare` 5 / `SetShare` 3） | R09–R11 → `C3` |
| `Data.splice` / `Data.length=0` / `filter` | 236 / 14 / 1 | R19/R35 → `U4`（丢弃机制存在） |
| `GetRaw` 调用点 | 40 | R19 → `U1`（build 后回读原文） |
| `BuildStatement` 调用点 | 53 | `X2`（legacy 建树） |
| `legacy` 字样引用点 | 422 | `X2` |
| `Jsx/JSX` 引用点 | 1 | R36 → `X3` 仅 1 处 |
| 审计覆盖面 | **638 / 638** 个 `.xl.md` | 每个文件都出现在某篇的小节标题或表格行里（`_tools/verify-coverage.mjs` 核对，0 漏） |
| 偏离条目总数 | **1 660 条** / 381 个文件的小节结论为「偏离」 | 逐篇「本批统计」加总 |

> 机械读数只用于**定位**，定性一律以各篇的逐文件条目为准。例如「compute 内有循环」不等于「每轮重扫」——循环也可能扫的是已缓存的区间。

## 2. 文档地图

35 篇区域文档把 638 个文件**不重不漏**地分完（每篇的文件数相加 = 638）。

| 文档 | 覆盖 | 文件数 |
| --- | --- | --- |
| [`01-rules.md`](01-rules.md) | 判据 R01–R36 与偏离编号定义、每文件输出模板 | — |
| [`10-core-syntax.md`](10-core-syntax.md) | `core/syntax/*.xl.md` | 20 |
| [`11-core-basic-tokens.md`](11-core-basic-tokens.md) | `core/syntax/basic-tokens/*.xl.md` | 9 |
| [`12-core-basic-tokens-string.md`](12-core-basic-tokens-string.md) | `core/syntax/basic-tokens/string/*` | 9 |
| [`13-core-templates.md`](13-core-templates.md) | `core/syntax/templates/*` | 10 |
| [`14-core-misc.md`](14-core-misc.md) | `core/common-util`、`extensions`、`exceptions`、`messages` | 5 |
| [`20-statements-builder.md`](20-statements-builder.md) | `statement-builder` | 1 |
| [`21-statements-operator-boundary.md`](21-statements-operator-boundary.md) | `statement-operator-body`、`statement-boundary-util` | 2 |
| [`22-statements-shape-ast-route.md`](22-statements-shape-ast-route.md) | `statement-shape-ast`、`statement-route-util`、`block-possible-shape` | 3 |
| [`23-statements-scanner-shape-bracket.md`](23-statements-scanner-shape-bracket.md) | `statement-scanner`、`statement-shape`、`bracket-role-resolver`、`expression-statement-possible-shape` | 4 |
| [`24-statements-possible-batch.md`](24-statements-possible-batch.md) | 语句层 14 个 possible/end/目录文件 | 14 |
| [`25-statements-small.md`](25-statements-small.md) | 语句形状壳与恢复/指标 24 个 | 24 |
| [`30-declarations-big.md`](30-declarations-big.md) | `class-declaration-shape`、`export-declaration-possible-shape` | 2 |
| [`31-declarations-shape.md`](31-declarations-shape.md) | `type-alias`/`module-block`/`function`/`variable` 四个 declaration shape | 4 |
| [`32-declarations-possible.md`](32-declarations-possible.md) | 声明层 8 个 possible/end/shape | 8 |
| [`33-declarations-rest.md`](33-declarations-rest.md) | 声明层 18 个 | 18 |
| [`34-declarations-small.md`](34-declarations-small.md) | 声明层 25 个小文件 | 25 |
| [`35-declarations-forms.md`](35-declarations-forms.md) | `declarations/forms/*`（装配/委派/挂载） | 8 |
| [`40-types-builder.md`](40-types-builder.md) | `type-builder`、`member-shell-catalog`、`property-signature-possible-shape` | 3 |
| [`41-types-possible.md`](41-types-possible.md) | 类型层 24 个 possible/shape | 24 |
| [`42-types-small.md`](42-types-small.md) | 类型层 35 个小 shape | 35 |
| [`50-expressions-builder.md`](50-expressions-builder.md) | `expression-builder`、`operator-shape-map`、`right-operand-possible-shape`、`shape-operator-stack`、`feas-operator-parser` | 5 |
| [`51-expressions-small.md`](51-expressions-small.md) | 表达式标记 shell 与小型候选 43 个 | 43 |
| [`52-expressions-primary.md`](52-expressions-primary.md) | `expressions/forms/primary/*` | 19 |
| [`53-expressions-forms.md`](53-expressions-forms.md) | `forms/operator`、`forms/prefix`、`forms/postfix` | 16 |
| [`54-expressions-shared.md`](54-expressions-shared.md) | `forms/shared/*` | 5 |
| [`60-direct-engine.md`](60-direct-engine.md) | `direct-expression-engine` | 1 |
| [`61-direct-sessions.md`](61-direct-sessions.md) | 4 个 direct session | 4 |
| [`62-direct-rest.md`](62-direct-rest.md) | direct 其余 14 个 | 14 |
| [`70-files.md`](70-files.md) | `source-file-end-possible-shape`、`source-file-shape`、`bundle-shape` | 3 |
| [`80-run.md`](80-run.md) | `typescript/run/*` | 5 |
| [`81-keywords.md`](81-keywords.md) | `keywords/*`（84 个关键字形状，表格逐文件） | 84 |
| [`82-punctuation.md`](82-punctuation.md) | `punctuation/*`（61 个标点形状，小节逐文件） | 61 |
| [`83-jsdoc-and-shims.md`](83-jsdoc-and-shims.md) | `jsdoc`、`jsx`、`trivia`、`synthetic`、`literals`、`aliases`、`names`、`positions` | 117 |
| [`85-members-bindings.md`](85-members-bindings.md) | `members/*`、`bindings/*` | 17 |
| [`86-ast-and-root.md`](86-ast-and-root.md) | `typescript/ast/*`、`tokens/{item-util,shape-insert-util}`、`cjcli.xl.md` | 16 |
| [`98-deviation-index.md`](98-deviation-index.md) | **生成物**：编号 → 涉及文件清单（脚本汇总） | — |
| [`99-summary.md`](99-summary.md) | **分类总结**：九个偏离族、最要命十二条、合规面、按 IMPORTANCE 问题分类对号入座、建议 | — |

> 纯标记类文件（类体只有构造函数）在 `81`/`83` 里用「表格逐文件一行」给出；有方法体或有引用的文件一律单列小节。这条格式约定写在 [`01-rules.md`](01-rules.md) 的模板要求第 5 条。

## 3. 口径与已知差异（避免误读）

1. **`B1`（越界）多数不是「写错了」，而是「表达不了」**：候选的返回类型是 `ShapeStates`，只有 `Reject/Accept/Uncertain`；`Nothing` 只存在于 `ComputePossibleShapesStates`（`core/syntax/shape-states.xl.md:5-7`）。所以 R25 在候选侧只能用 `Uncertain` 近似——各篇统一记 `B1` 并注明「类型不可表达」。
2. **`D1`（散文）有两个口径**：按「围栏内一律不算散文」是 **0**；按 R01 的字面（只有 ```` ```txt ```` 围栏豁免）是 **1** 处（`declarations/forms/declaration-asi-boundary.xl.md` 用了无标注围栏放示例）。本套文档以严格口径记录、按宽松口径报数。
3. **机械读数只用于定位**：`_facts/` 里的 `catch(possible)`、`loop(possible)`、`lookahead` 是按方法名与正则匹配的启发式，会把「catch 后重抛」「循环只扫已缓存区间」也算进来；个别地方与实际不符（例如子审计实测 `statement-end-possible-shape` 的 `catch(possible)×2` 在源码里是 0 处）。**定性一律以逐篇条目为准**。
4. **`_facts` 的 prose 列是可复算的精确值**（排除标题、`- case` 列表、`import/export` 行之后为 0），不是最初版本里把 `### get`、枚举 `- case` 误算进去的数字。
5. **`tests/gates` 未运行**（用户要求忽略 gates 验证）；本套文档不含任何门禁读数，也不以门禁结果为依据。

## 4. 怎么读

1. 先读 [`01-rules.md`](01-rules.md) 拿到编号含义。
2. 想查某个文件：直接在上表的对应区域文档里搜文件名（每篇的文件节标题就是相对路径）。
3. 想看清全貌：读 [`99-summary.md`](99-summary.md)，它按 9 个族归纳，并给出「同一症结出现在哪些文件」的索引。
4. 想复核某条结论：按条目里的 `文件:行号` 打开源码；机械读数可跑 `node docs/importance-1028/_tools/importance-scan.mjs` 复算（会重写 `_facts/` 与 `tmp/importance-facts.json`）。
