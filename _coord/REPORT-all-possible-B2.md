# REPORT-all-possible-B2 — 裸表达式语句族增量形状（Phase B 最大单批）

- 任务板：`task-7`（WP-B2）
- 分支：`feat/b2-expression-stmt`（base `base-int` @ `42153469`，含双开关 / tts-impl / 45 条迁移）
- 克隆：`C:\Users\Admin\Documents\GitHub\xl-example-set\b2-expression-stmt`（canonical 只读；未 push、未删目录）
- 结论：**61 条 atomic 达成 `incremental` 并迁入 `tts-impl`**；`tts` 剩余 319 条全 PASS；
  `tts-impl` PASS 106 / FAIL 0；`xl_build` 0 error；`tsc -p .` exit 0；开关 false 与 base 逐字符树逐字节一致。

## 1. 实现结构（改的是 own 文件，2 个）

只改了 `typescript/tokens/statements/statement-shape.xl.md`（`// [E-SHAPE:MOUNT]`）与
`typescript/tokens/statements/root-expression-statement-possible-shape.xl.md`（`// [E-STMT:CATALOG]`），
没有新增文件，没有碰 `statement-operator-body` / `statement-route-util` / `expression-catalog-factory` /
`variable-declaration-shape` / direct-*，也没有改 tts/tts-impl 的 INDEX/README。

### 1.1 核心思路（与 PLAN §1.3 等价、但不走新 catalog）

`StatementOperatorBody` 本来就是完整 token 级表达式状态机，缺的只是「把归约结果挂进壳的可见 `Data`」。
本 WP 的做法：

1. **喂**：`StatementShape.ComputePossibleShapes` 里既有 `OperatorBody.IngestAll(this.Data)` 不动；
   另外加一个**影子体**——用同一个状态机在**当前全量 raw 单元**上重放一遍（只写影子自己的 Frames，
   不碰主状态机的 `Ingested/Units/Root`）。壳的候选计算是「上一格单元关闭」触发的，`Data` 末尾经常
   躺着还没喂给主状态机的新单元；影子体重放能补上这个滞后。
2. **物化**：影子体/主状态机归约到完整表达式时，调**收口路径同一个桥** `StatementShapeAst.Build`
   把当前前缀转成 AST 形状（类名 / `Pos` / 层级与 EOF 树同源，账本按 `(类名,pos)` 直接对上）。
   覆盖核对用的单元会剥掉尾随 `;` / trivia（`"s";` / `/re/g;` 这类字面量在 `;` 那格才关闭）。
3. **挂**：把 AST 形状**原地**挂进壳的 `Data`（`IncrementalRaw` 保存被覆盖的 raw 序列，
   `IncrementalMounted` 记挂载点）。于是**每一步 `ToAstLine` 都能看到已经长出的形状**。
4. **卸**：`ComputePossibleShapes` 开头、`BuildFromShell` 开头、`TryToClose` 开头、`ExitOrPre` 开头
   都先 `UnpackIncremental()`，把 `Data` 原地还原成 raw 序列（同一个数组对象、同一批 Token、同一顺序，
   所以 `OperatorBody.Ingested` 的下标语义继续有效）。收口路径看到的**始终是 raw `Data`**，
   最终仍走既有 S3c / legacy 路径 ⇒ EOF 树与 legacy 逐节点一致。
5. **逐字符钩子**：`StatementShape.Process` 覆写——`super.Process` 之后尝试一次物化。因为新单元的
   `Close`（父单元 `ComputePossibleShapes`）要等到下一格，而 `a.b` / `-a` / `f()` 这类形态的最后一格
   恰好就是「表达式完成」与「语句收口」同一格；在本窗口处理完再挂一次，形状才能提前一格出现在可见树。
6. **建壳首格**：`RootExpressionStatementPossibleShape.BuildByIndex` 在「首格就建壳」的分支调
   `shell.PrimeIncremental(context)`（只喂 + 挂，**不跑终结候选**，收口时机不变），覆盖
   `[...a]` / `(class { })` / `(function () { })` 这种首格就是完整括号单元的形态。

### 1.2 门控点（false = 逐字节 legacy）

每一个新入口的第一行都是 `if (!StatementRouteUtil.IsIncrementalShapesEnabled()) return;`
（`ComputePossibleShapes` 的卸载、`UnpackIncremental` 的挂载判据、`TryMountIncremental`、
`PrimeIncremental`、`Process` 覆写）。`run.mjs` 的 `setIncremental(false)` 把两个开关都置 false，
所以 legacy 分支不会执行任何新代码（`UnpackIncremental` 在未挂载时立即返回，`Process` 覆写只多一次
false 判断）。**没有静默退回 legacy 假装增量**：桥建不出来时不挂（本格照旧 raw），收口仍由
legacy/S3c 产出正确树；分类由账本自己判，不会把「树不同」判绿。

### 1.3 排除域（跨 WP 边界，避免抢 case）

- `as` / `satisfies` 的类型尾部（`ExpectTypeTail` / `TypeTailUnits > 0`）**不接管**：归 A5 / B4b-*。
  （实测这两个形态仍会因「裸表达式前缀」变绿，已在迁移清单里单列，见 §5。）
- `expr-await`、`expr-yield`、`expression-let-identifier` 仍 atomic（见 §4）。
- 没有改 `statement-route-util`，所以 `await` / `let` 的**路由归属**没有变。

## 2. 目标 case 前后分类表（`--show` 实测）

迁移前 380 条：`throw 125 / atomic 192 / partial 53 / incremental 0`（base 已把 45 条 incremental 迁走）。
迁移后 `tts` 剩 319 条、`tts-impl` 106 条（45 + 61）。

| area | 迁移条数 | 其中目标族 | 其中连带解锁（B1/B4/B6 面） |
| --- | ---: | ---: | ---: |
| statements | 36 | 22 (`expr-*`) | 14（`asi-*` / `foreach-call` / `stmt-*` / `if-else-block` / `do-while` / `while-block` / `try-*` / `block-statements`） |
| lexical | 13 | 12 (`expression-*`) | 1（`asi-return-newline`） |
| expressions | 10 | 10（bootstrap 新增，含用户点名 `a < b && c > d`） | 0 |
| types | 2 | 0 | 2（`as-expression-statement` / `satisfies-expression-statement`，见 §5） |
| **合计** | **61** | **44** | **17** |

> 目标族 44 = statements `expr-*` 22（`expr-await`/`expr-yield` 未达成，见 §4）
> + lexical `expression-*` 12（`expression-let-identifier` 未达成）
> + bootstrap expressions 10。
> 迁走的 `expr-*`：arrow, assign, binary-arithmetic, binary-bitwise, binary-comparison, binary-logical,
> call, class-expr, comma, function-expr, index, literal, member, new, nonnull, optional-chain, regex,
> spread-array, template, ternary, unary, update-postfix（22 个；`expr-await` / `expr-yield` 未绿）。

### 2.1 用户点名 `a < b && c > d`（`expressions/bin-and-comparison`）

```text
PASS  expressions/bin-and-comparison.ts
      actual=incremental  steps=16
      earlier: IdentifierShape@pos=0, BinaryExpressionShape@pos=0, FirstBinaryOperatorShape@pos=1,
               IdentifierShape@pos=3, AmpersandAmpersandTokenShape@pos=5, IdentifierShape@pos=8,
               BinaryExpressionShape@pos=8, GreaterThanTokenShape@pos=10, IdentifierShape@pos=12
```

`expr-arrow` / `expr-member` / `expr-template` / `expr-class-expr` / `expr-literal` / `expr-regex` 等
`--show` 均为 `actual=incremental`（分类器输出 `PASS <area>/<name>.ts` + `earlier:` 节点列表）。

## 3. EOF 树一致性 / 开关 false / 确定性（证据）

1. **EOF shape 树一致**：账本 `classify` 对每条 case 都同时跑 legacy 与 incremental 并比较
   `shapeLines`（类名 + pos + 文本字段）；61 条新 incremental 全部 `divergent=0`，
   剩余 319 条也全部 PASS。`tmp/after3.json` 里 61 条 `pass=false` 是「目录标注未更新」，
   `actual` 全部是 `incremental`、`reason` 为 `NOW-SUPPORTED`，无一条 `divergent/invalid/throw`。
2. **开关 false = base 逐字节一致**（tmp 探针 `tmp/probe.mjs legacysteps`，每格完整树）：
   - `expr-arrow`：`identical=True`
   - `bin-and-comparison`（`a < b && c > d;`）：`identical=True`
   - `foreach-call`：`identical=True`
   做法：`git stash push` 两个 xl.md → 重建 base 产物 → 每格树存 `tmp/base-check/basesteps-*.txt`
   → `stash pop` → 重建本分支产物 → `tmp/base-check/cursteps-*.txt`，逐字节比较均为 **diff 0 行**。
3. **确定性**：两次独立进程 `node typescript/cases/tts/run.mjs --quiet --json tmp/det{1,2}.json`
   SHA256 相同：
   `3B02309F01B51B7A384DF353D96DF49FCD5A33F3670D7C6BD5CAF15DF0BA8594`。
4. **构建**：`xl_build cwd=<克隆> paths=["core","typescript"] targets=["ts"]` → 0 error（3 条既有 E1107 warning）；
   `node node_modules/typescript/bin/tsc -p .` → exit 0。

## 4. 剩余未绿（不是本 WP 能收的）

| case | 现状 | 原因 |
| --- | --- | --- |
| `atomic/statements/expr-await` | atomic | `await` 的头格路由不在 `ShellPlainExpression`（`StatementRouteUtil.Decide` 判给别的族），**没有语句壳**，本 WP 的挂载点根本不执行。归 E-base/B1 的 `await` 族路由（`statement-route-util` 由 Lead 持有）。 |
| `atomic/statements/expr-yield` | atomic | 文件是 `function* g() { yield 1; }`——**函数声明**，不是裸表达式语句；归 B3 的声明族。 |
| `atomic/lexical/expression-let-identifier` | atomic | `let = 1` 是「`let` 当标识符」的词法/声明族形态（路由给变量/声明族），不是纯表达式语句；归 A6/B1。 |
| 其余 319 条 | 标注不变 | 非本批目标，逐条 PASS（class 目录标注未动）。 |

`residualBasicLines`：本批 61 条全部为 0（`tmp/after3.json`）。

## 5. 连带解锁 / 跨 WP 边界（需要 Lead 裁决的两处）

1. **17 条连带解锁**（§2 表格）：同一条「裸表达式语句形状物化」机制也让 **块内/控制流体内的表达式语句**
   （`try-catch` 里的 `f();`、`while-block` 里的 `f();`）和 **ASI 边界后的第一条表达式语句**提前出现。
   这 17 条按目录归属属于 B1 / B4b-ii / B6 的清单，但分类已由本机制变绿；为了账本 exit 0（验收硬门），
   本 WP 一并迁入 `tts-impl`（`statements` / `lexical` / `types` 三个 area）。建议 Lead 在合并时把
   这 17 条从 B1/B4b-ii/B6 的目标清单里扣除，避免后继 WP 重复迁移。
2. **`bin-mul-add` 命名冲突**：`tts-impl/cases/expressions/bin-mul-add.ts` 在 base 已存在
   （内容 `let x = 2*3+1`，A/E0b 的变量声明 case）；atomic 版是 `2*3+1`。
   `git mv` 目标已存在，故 atomic 版迁为 **`expressions/bin-mul-add-bare.ts`**（内容逐字节不变）。
   这是全批唯一一次改名，已在清单中标注。

## 6. 给 B1 / B3 的复用建议

1. **控制流/声明族不要重复造轮子**：本次挂载点挂在 `StatementShape`（`Kind=ShellPlainExpression`）上，
   对「块体内 / 控制体内部」的表达式语句自动生效。B1 只需要做**族壳自己的 token→shape**（if 条件、
   for 头、case 子句），块体内表达式语句不用再写一遍。
2. **族壳也可以复用同一套「影子体 + StatementShapeAst.Build + 挂载/卸载」**：把
   `UnpackIncremental/PrimeIncremental/TryMountIncremental` 的三个字段与两个方法照搬到族壳
   （`variable-declaration-shape.xl.md` 的初始化器、B3 的类成员初始化器），收口前卸载一次即可，
   EOF 树由既有 S3c/legacy 路径保证一致。
3. **别碰 `statement-shape.xl.md`**（本 WP 独占）：B1 若需要改壳的收口/挂载，请先与 Lead 串行。
4. **影子体是解决「候选计算滞后一格」的通用手法**：任何基于 `ComputePossibleShapes` 增量钩子的族壳，
   都会遇到「Data 末尾新单元还没喂进状态机」；用同一状态机重放全量 raw 单元比改 `IngestAll` 安全。

## 7. 风险

1. **性能**：`TryMountIncremental` 每格会创建影子体并可能跑一次 `StatementShapeAst.Build`（O(语句长度²)，
   语料每条 ≤ 若干十字符）。本阶段语料无感；长文件/大表达式上界需要 B6/B7 之前评估一次（可加
   「只在上一次构建的单元数变化时重试」缓存）。
2. **静态计数器**：影子体 + 每格 `Build` 会放大 `StatementOperatorBody.TotalBodies` /
   `StatementShapeAst.TotalShapeAst` 等指标计数。账本与 tts-impl 不看这些数；**既有 gates（本阶段禁跑）
   若断言计数，需要按「增量模式允许影子计数」更新口径**——这是给 B7 的待办。
3. **`StatementShape.Process` 覆写**：`super.Process` 之后挂载会改 `Data` 结构（raw ⇄ 形状）。
   所有读壳 `Data` 的收口入口（`BuildFromShell` / `TryToClose` / `ExitOrPre`）都已先卸载；
   若 B6 新增别的 `Data` 读取点，必须同样先 `UnpackIncremental()`，否则会读到挂载形状。
4. **未做 `src` 收尾**：本路径不产 `src` 缺陷（挂载节点的 `src` 由 `StatementShapeAst`/`ExpressionBuilder`
   同源生成），但 94 条既存 `rangeOnlyDifference` 仍留给 B6；本 WP 不碰。
5. **`as`/`satisfies` 的归属**：本 WP 已用 `ExpectTypeTail`/`TypeTailUnits` 排除「类型尾部」的物化，
   但它们的**前缀**（`a`）仍可能让 case 变绿（§5）；A5/B4b-* 收口时需注意 `tts-impl` 已存在这两条。

## 8. 迁移清单（61 条，内容逐字节不变）

- `tts-impl/cases/statements/`（36）：`expr-arrow, expr-assign, expr-binary-arithmetic, expr-binary-bitwise,
  expr-binary-comparison, expr-binary-logical, expr-call, expr-class-expr, expr-comma, expr-function-expr,
  expr-index, expr-literal, expr-member, expr-new, expr-nonnull, expr-optional-chain, expr-regex,
  expr-spread-array, expr-template, expr-ternary, expr-unary, expr-update-postfix`（22）
  + `asi-newline, asi-postfix-newline, asi-return-newline, asi-same-line, block-statements, do-while,
  foreach-call, if-else-block, stmt-array-literal-start, stmt-object-literal-paren, try-catch-nobind,
  try-catch, try-finally, while-block`（14）
- `tts-impl/cases/lexical/`（13）：`expression-angle-chain, expression-array-literal, expression-async-arrow,
  expression-block-comment-between, expression-call-type-args, expression-new-call, expression-object-in-paren,
  expression-optional-ternary, expression-paren-arrow, expression-paren-assign, expression-paren-sequence,
  expression-shift-generic, asi-return-newline`
- `tts-impl/cases/expressions/`（10）：`bin-add-mul, bin-and-comparison, bin-mul-add-bare（改名，见 §5.2）,
  bin-paren-mul, call-bare, cond-bare, ref-index, ref-property, unary-minus, unary-not`
- `tts-impl/cases/types/`（2）：`as-expression-statement, satisfies-expression-statement`

## 9. 验收读数（本分支最终）

```text
xl_build { paths:["core","typescript"], targets:["ts"] }  → 0 error / 3 warning(既有)
node node_modules/typescript/bin/tsc -p .                 → exit 0
node typescript/cases/tts/run.mjs --quiet                 → PASS 319 / FAIL 0 / 319
    [tts] 319 条 case：throw 125/125 · atomic 141/141 · partial 53/53 · incremental 0/0
node typescript/cases/tts-impl/run.mjs --quiet            → PASS 106 / FAIL 0 / 106
开关 false 逐字符树 vs base（3 条关键 case）              → diff 0 行
两次独立进程 --json                                        → SHA256 相同
```

## 10. 交接（若后续 WP 接手）

- 已完成：61 条迁移、挂载/卸载/影子体/首格钩子、门控、报告、检查点提交。
- 未完成：`expr-await`（路由在别的族，需要 Lead 改 `statement-route-util`）、`expr-yield`（B3 声明族）、
  `expression-let-identifier`（A6/B1 词法声明族）；以及 §7 的指标口径与长表达式缓存（B6/B7）。
- 下一个接手者从本分支 commit 拉出即可；`tts/cases` 剩余 319 条全部仍按未支持标注，未做任何标注洗白。
