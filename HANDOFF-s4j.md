# HANDOFF — Stage 4j：函数体语句接管落地与安全边界

分支 `feature/possible-statement-s4j`，基线 `origin/feature/possible-statement` @ `643d2ca0`。

## 1. 结论（先说结果）

**步骤 1 + 步骤 3 已落地并全表绿；步骤 4/5 未推进（未伪造绿）。** 目标形态
`function f(){ let x=1; if(x) f(); }` 已由 possible 接管：函数体括号挂上块体语句目录，
壳内两条语句（`let x = 1;` 与 `if (x) f();`）由目录增量建成 `StatementShape`，收口时被
`StatementBuilder.CollectBodyStatements` 按序收集，XML 与 legacy 逐字节相同、无 fallback、无壳泄漏。

| 项 | 基线 | 本分支 |
|---|---|---|
| `xl_build`（core+typescript → ts） | 887 written / 0 error | 887 written / 0 error |
| `tsc -p tsconfig.json` | exit 0 | exit 0 |
| `token-ast` | 1716 / 1706 ok / 0 crash / 0 diff / 10 ts-invalid | **同左，逐项一致** |
| `real-dts-ast` | 226 / 226 | 226 / 226 |
| `ast-json` | 6167 / 6167 | 6167 / 6167（47 构造，cj-fail=0） |
| `ast-json-diff` | 全一致 | 6167 / 6167 完全一致（结构差 0、位置差 0、字段差 0） |
| `harness --all` | 101 pass / 0 fail / known 1 | 101 / 0 / known 1（fallback 0） |
| `--double-accept` | 0 冲突 | 0 冲突（cases=120） |
| `--lint` | PASS | PASS |
| `control-flow-takeover` | 39 / 39 | 39 / 39 |
| `block-body-takeover` | 21 / 21 | 21 / 21 |
| `stage4b` / `stage4-block` / `stage4c` / `stage4c2` / `operators-live` | 17 / 12 / 42 / 33 / 40 | 同左，全 0 fail |
| `validate` | 1720 / 0 | 1720 / 0 |
| `op-ast-proof` / `op-proof` | 90 / 40 | 90 / 40 |
| `comma-import-fallback` | 11 / 11 | 11 / 11 |
| `feas-operator` + `insert-between` | 6 + 9 | 6 + 9 |
| `perf` | 线性 2.24 / 2.06 | 同量级（37ms @2000 语句，callsPerToken 17.01） |

`perf` 与 `2000 语句` 读数与基线同量级；`git status --short typescript/cases` 为空（ast-json 等价）。

## 2. 收集通道（步骤 1）：复用块体那一条，不新开第二条

S4i §5 的判断「函数体缺 `CollectBodyStatements` 通道」在本轮被实测**收窄**：
`FunctionDeclarationShape.FromUnits` 建体走的是
`StatementBuilder.BuildStatement()`（单个 `{…}` 括号单元）→ `BuildBlock()`，而 `BuildBlock()`
里已经有 `StatementBuilder.HasBuiltBodyStatements(bracket)` → `CollectBodyStatements(bracket, shape)` 的
分流（4b-r2 落地）。也就是说**通道本身是通用的**，函数体/方法体/构造器体只要括号里出现了
已建语句形状就自动走收集；缺的只有「谁给这个括号挂目录」这一个动作。

因此本轮没有复制一份 `CollectBodyStatements`（复制会造出第二套 `Pos` / raw 段口径，正是 S4i §5 警告的
「把已建形状当 raw 丢掉/错认」的来源），而是新增**唯一**的挂载入口
`BlockPossibleShape.TryMountFunctionBody(unit, bracket, context)`，让函数体与块体共用同一条收集通道。

## 3. 通知口径（步骤 2 / 方案③的安全等价物）：只给新括号挂目录，绝不重算宿主

S4i 实测的三种修法里，①削弱 `CatalogGuide` 不变量、②猜测式补算都被否掉；本轮走的是 ③ 的
**不重算版本**：

- 触发点仍是 `Bracket.Transit` 已有的 `OnBracketCreatedEvent`（父单元收到「我这儿新建了一个括号」）；
- 处理函数只做两件事：**读宿主 `Data` 找新括号前面那个非 trivia 单元**、**给新括号自己挂目录**；
- **不调用任何 `ComputePossibleShapes*`**——这是与 S4i 方案 A 唯一的、也是决定性的差别。方案 A 全表红的根因是
  「子括号刚建、还没闭合」时回调宿主目录，宿主的 `Candidates` 合法地全被拒，落进
  `size === 0 && EndPossible === null` 的抛错出口（82 crash / 56 AST 失败）。
- 新括号的目录带 `BlockBodyWaitingPossibleShape` 作终结候选（`EndPossible !== null`），所以**一个候选都不接**
  时目录返回 `Waiting` 而不是抛错——「未覆盖构造安全回退」由这条终结候选兜住，不需要放宽 `CatalogGuide`。

判据（`TryMountFunctionBody`）只有一条：新括号是 `{`、且前一个非 trivia 单元是 **`StartBracketChar === "("`
且已 `Closed` 的括号单元**。本语法里 `(` `)` 是同一个 `Bracket` 单元，所以「`)` 之后紧跟 `{`」在这里落地为
「前一个单元是已闭合的参数表括号」。这条判据能覆盖 `function f() {}` / `function e() {}` / `async function h() {}`，
但**不覆盖** `function g(): T {}`（`{` 前是类型标识符）与 `if (a) {…}`（`{` 被控制流壳接走，宿主不是根）。

挂载点：`SourceFileShape.OnBracketCreatedEvent`（根层函数声明），门控
`EnableShellExpressions && EnableBlockBodyCatalog`（与既有开关同一套；legacy 对拍档 `false` 时什么都不做）。

## 4. 接管证据（函数体、深层嵌套）

`s4j-function-body.mjs` 对每条源码同时跑接管档与 legacy 档（`EnableShellExpressions=false`），断言
「不抛错 / 不触发文件级 fallback / XML 逐字节相同 / 两次接管档 XML 相同 / 无 `<StatementShape` 泄漏」，
并打印 `FunctionBodyMountCount`（挂载次数）、`BlockBodyStatementCount`（被收集的已建语句数）、
`BlockShellCount` 的增量。

PASS  "function f(){ let x=1; if(x) f(); }"  mount=1 body=2 shells=0
PASS  "function g(a: number): number { let y = a; while (y) f(); return y; }"  mount=0 body=0 shells=0
PASS  "function e(){}"  mount=1 body=0 shells=0
PASS  "async function h() { await f(); }"  mount=1 body=0 shells=0
PASS  "class C{ m(){ let y=2; while(y) f(); } constructor(){ this.x=1; } }"  mount=0 body=0 shells=0
PASS  "const o = { m(){ let z=1; } };"  mount=0 body=0 shells=0
PASS  "{ { { a; } } }"  mount=0 body=1 shells=2
PASS  "{ { { let x=1; } } }"  mount=0 body=1 shells=2
PASS  "{ { a; } { b; } }"  mount=0 body=2 shells=3
PASS  "if (a) { let x = 1; }"  mount=0 body=0 shells=0

[s4j-function-body] cases=10 failed=0

| 源码 | mount 增量 | 已收集语句 body 增量 | 块壳 shell 增量 | 结果 |
|---|---|---|---|---|
| `function f(){ let x=1; if(x) f(); }` | 1 | 2 | 0 | PASS |
| `function g(a: number): number { let y = a; while (y) f(); return y; }` | 0 | 0 | 0 | PASS |
| `function e(){}` | 1 | 0 | 0 | PASS |
| `async function h() { await f(); }` | 1 | 0 | 0 | PASS |
| `class C{ m(){ let y=2; while(y) f(); } constructor(){ this.x=1; } }` | 0 | 0 | 0 | PASS |
| `const o = { m(){ let z=1; } };` | 0 | 0 | 0 | PASS |
| `{ { { a; } } }` | 0 | 1 | 2 | PASS |
| `{ { { let x=1; } } }` | 0 | 1 | 2 | PASS |
| `{ { a; } { b; } }` | 0 | 2 | 3 | PASS |
| `if (a) { let x = 1; }` | 0 | 0 | 0 | PASS |


## 5. 深层嵌套块（步骤 4）：本轮**未推进**，读数为基线原值

`{ { { a; } } }` → `shells=2 / body=1`；`{ { { let x=1; } } }` → `shells=2 / body=1`；
`{ { a; } { b; } }` → `shells=3 / body=2`。与 S4e 记录的「深度 2 边界」逐项相同：
第 3 层块不再建壳，最内层块的**块体内部语句**仍由 `BuildBlock` 的 legacy raw 递归建（不计数），
最外层只收集到「内层块形状」这一条。要推进到深度 ≥2 的内层块体，需要让块体目录里的
`BlockPossibleShape` 在内层 `{` 建出后同样能挂目录——那正是 S4i 方案 A 撞到的时刻
（内层 `{` 刚建、未闭合，宿主目录回调会被合法全拒），本轮**没有**冒这个险。

## 6. 未覆盖清单（按优先级）

| 构造 | 现状（本轮实测） | 缺什么 |
|---|---|---|
| `function f(): T { … }` 带返回类型的函数体 | `{` 前是类型标识符 → **不挂目录**（mount=0），体走 legacy raw | 判据要加「类型收住后紧跟 `{`」，`TypeBuilder.IsBodyBrace` 是现成的候选判据 |
| 类方法体 / 构造器体 | mount=0：`{` 被类体成员候选的宿主接走，不回到 `ClassDeclarationShape` | 需要在**方法体括号的宿主**（成员形状）上也调 `TryMountFunctionBody`；先用 `ClassDeclarationShape.OnBracketCreatedEvent` 试过一次不可达（宿主不是类壳） |
| 对象字面量方法体 | mount=0（宿主是对字面量括号） | 同上 |
| 箭头函数块体 | 未测（`{` 前是 `=>`，判据不命中） | 加 `=>` 判据 |
| `if (a) { … }` / 循环体 / `catch` 体 | mount=0（`{` 被控制流壳接走） | 控制流壳自己实现 `OnBracketCreatedEvent` |
| `async function` 体里的 `await` 语句 | mount=1 但 body=0：`await` 起点没进块体目录，raw 段建 | 块体目录候选补齐 `await` 起点（表达式族） |
| 嵌套块深度 ≥2 的内层块体 | 同 §5 | 见 §5 |
| 声明族 / import-export 列 | 完全 legacy | 后续 Stage |

## 7. 风险

| id | 风险 | 兜底 |
|---|---|---|
| R1 | 判据「`)` 后紧跟 `{`」宽于「这是函数体」：`if (x) {}` / `catch (e) {}` 也满足 | 挂目录**不改任何 AST 决定**，收口侧仍走 `BuildBlock`/`CollectBodyStatements`；目录的终结候选是 `BlockBodyWaitingPossibleShape`（不抛错）。全表四步 ast-json + token-ast + real-dts 逐项与基线一致是这条的实测证据 |
| R2 | 方法体 / 构造器体没接管，容易被误读成「已接管」 | 探针把 mount=0 钉成断言，`HANDOFF` §6 列明；提交信息也只声明函数声明体 |
| R3 | 带返回类型的函数体（真实代码里占多数）没接管 | 同上：mount=0 是断言值，不是猜测；`TypeBuilder.IsBodyBrace` 已定位为下一步判据 |
| R4 | `dev` 组有 1 条 fallback（`let a = 1; a++; --\na;…`） | 该行为基线既有（与 S4j 改动无关：它不含函数体），`harness --all` 的 file-fallback 计数仍为 0 |

## 8. 文件

新增：`tests/statement-possible/s4j-function-body.mjs`（10 条源码 × 接管/legacy/确定性三重断言）、`HANDOFF-s4j.md`。
改动：`typescript/tokens/statements/block-possible-shape.xl.md`（`TryMountFunctionBody` + `FunctionBodyMountCount`）、
`typescript/tokens/files/source-file-shape.xl.md`（根层函数体挂载 + 说明）。**`core/` 无改动**，`dist/` 未手改（由 `xl_build` 生成）。
