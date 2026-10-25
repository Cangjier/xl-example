# HANDOFF 5d-6：`yield` 判界迁 boundary + raw 尾巴收尾

分支 `feature/possible-statement-5d6`，起点 `09ce8d8e`（5d-1a/2a/2b/1b/3/4 合并；LegacyDispatch 已 0）。
本轮两个 commit：

| commit | 内容 |
| --- | --- |
| `d1c36234` | 源码 + 探针：A（`yield` 判界迁 boundary）+ B（`await` 同构迁移 / 标签体挂目录）+ `docs/possible-statement-5d-plan.md §10` |
| `7e30f23b` | **基线单独 commit**：`tests/statement-possible/legacy-baseline.json`（body 里写了前后四项指标） |

## 1. 结论先行

| 指标 | 起点 | 终点 | 变化 | 达标 |
| --- | --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 | ✅ 保持归零 |
| `ScanRootCallCount` | 18124 | **17718** | **−406** | ✅ A 的 +184 收回，并额外 −222（`await`） |
| `RawTailBuildCount` | 215 | **139** | **−76** | ⚠️ 未归零（剩余清单与原因见 §5） |
| `ShapeAstDeclinedCount` | 328 | 328 | 0 | — 本轮未动（不是本轮目标） |
| `FileFallbackCount`（交叉校验） | 50 | 50 | 0 | ✅ 没有靠整文件重解析换数字 |
| 全门 | — | **零回归**（读数见 §6） | — | ✅ |

- **A（必做）完成**：`yield` 族的判界完全在 boundary 层（`IsYieldFamilyCode` + `YieldFamilyEndCode`），
  终结候选 / `TryToClose` 上 **0 次 `ScanRoot`**；5d-4 记的 `+184` 精确收回（`19427 → 19243` 那一笔）。
- **B（尽量）做了一半多**：`215 → 139`。`await` 族顺带迁出（同一台机器，`−222` `ScanRoot` / `−18` raw），
  标签体挂上块体目录（`−58` raw，5d-4 §5 记的「结构性」清单里最大的一族）。**没有归零**，剩余 139 条
  全部归因到「路由 / 挂载」而不是判界，§5 逐族列出并给了下一步的杠杆，无假绿。
- **5d-4 记录的两条差异**（`yield;⏎yield;` 第二条、生成器内 `yield: 1`）本轮**先确认**：
  `EnableYieldStatement` 开 / 关两态 **XML 逐字节相同**，即**都是 5d-4 之前就存在的形状缺口**
  （前者第二条 `yield` 被建树成 `Identifier`，后者被建成 `LabeledStatement`），与判界迁移无关。
  按「不能顺带修就标 known-gap 并保持行为不变」处理：探针里 `astKnownGap`，行为一位没动。
  另外**新发现第三条**同类差异（`yield⏎;`：TS 把 `;` 计入同一条 `ExpressionStatement`，本实现多一个
  `EmptyStatement`），同样是开启 / 关闭逐字节相同，一并记 known-gap（§7 第 1 条）。

## 2. A：`yield` 判界迁到 boundary 层

### 2.1 三条入口，一份判据

| 文件 | 改动 |
| --- | --- |
| `statement-boundary-util.xl.md` | 新增 `IsYieldFamilyCode`（族判定）+ `YieldFamilyEndCode`（收口位置） |
| `statement-end-possible-shape.xl.md` | `ComputeByIndex` 在控制流族之后、`ScanRoot` 之前加 `yield` 分支；两个 `BuildByIndex` 分支各加一格（同一个 `atEof`） |
| `statement-shape.xl.md` | `TryToClose`（块体 `}` / EOF 兜底）加同一条分支，`atEof = true` |

壳的 `Kind` **没有**改（仍是 `StatementRoute.ShellStatementFamily`）：判界分派按**首代码单元**（族判据）
而不是新增一个 `Kind`，所以建树路径、`YieldShellCount` 与 `EnableYieldStatement=false` 的回退语义一位没变。

### 2.2 判据：与建造器同一套边界规则

```
YieldFamilyEndCode(code, atEof):
  1) 受限产生式：code[0] 与 code[1] 之间有行终止符 ⇒ 返回 0（`yield⏎(x)` = `yield;` + `(x);`）
  2) 否则按表达式语句：本层 `;` 收在 `;`；换行处
     `StatementBoundaryUtil.EndsAtLineBreak` 或 `ExpressionStatementPossibleShape.IsAsiBoundary`
     成立 ⇒ 收在前一个代码单元
  3) 到头：atEof ⇒ 末代码单元；否则 -1（继续等）
```

**为什么 AST 不可能变**：这两条判据正是 `StatementBuilder.BuildExpressionStatement` 自己的收口循环
（`;` → `EndsAtLineBreak` → `IsAsiBoundary` + `yield` 受限产生式），而 `BuildFromShell` 收口时
`builder.At === builder.Units.length` 是**硬断言**。所以「壳的 `End`」与「建造器算出的末格」同源，
不靠捕获异常兜住：`End` 偏长会抛「语句没有读完」，偏短会把余下单元交给 `FinishShell` 重放。
`EndsAtLineBreak` 是扫描器侧唯一实现点，`IsAsiBoundary` 是候选侧唯一实现点——**没有第二套 ASI**。

**为什么不能直接用 `CanEndStatement`（5d-4 试过的那条路）**：`CanEndStatement` 只在当前格回答「能不能收」，
它把 `yield⏎(x)` 的 `(` 判成「调用位续接」（`yield` 当标识符看），受限产生式那一格永远收不住；
5d-4 实测 20 条探针里 4 条整文件重解析。本方法把「`yield` 之后换行」放在最前面，先于任何调用位判断。

### 2.3 族判定：`yield:` 让给标签族

`IsYieldFamilyCode` 只认首代码单元 `yield` **且不是** `IsLabelHead`（`标识符 :`）。`yield: 1` 在非生成器里
是合法标签、在生成器里是 TS 的恢复形，两条都由控制流族的标签格（`ScanBodyEndCode(code, 2)`）负责——
与 `IsShortFamilyCode` 对 `let:` 的让法同构，族与族不重叠，**不靠候选先后**。

### 2.4 证据

- `tests/statement-possible/yield-boundary.mjs`（**新增**，56 条形态）：**56/56 pass**，`knownGap=3`；
  `yield` 族在终结候选路径上 **0 次** `ScanRoot`、`TryToClose` 上 **0 次**，非 legacy 调用点 **0 个**；
  正对照（块内 `class` 声明体壳）仍 > 0 次，证明计数器不是空转。覆盖：`yield` / `yield expr` /
  `yield* expr` / `yield;` / 无分号 / 受限产生式（`⏎(x)` / `⏎x` / `⏎[1]` / 块注释换行 / `⏎;` / `⏎}`）/
  两条相邻 / 无分号相邻 / 生成器方法 / 生成器函数表达式 / `async function*` / `for await` /
  标签体 / `if`·`while`·`for`·`switch`·`try` 体 / `yield: 1` / `yield = 1` / `yield(1)` / 模板操作数。
- `ScanRootCallCount`：`18124 → 17940`（`yield` 单独：−184，与 5d-4 的 `+184` 精确对账）。

## 3. B：raw 尾巴 215 → 139

### 3.1 `await` 族同构迁移（−18 raw / −222 `ScanRoot`）

`await` 也是块体目录候选（Stage 4l），5d-4 之前同样靠 `ScanRoot` 判界——而 `ScanRoot` 对 `await` 语句
**给不出 `End`**（Mismatch），所以这一族只在「整段体恰好一条语句」时收得住；其余情况壳拖到 `}`、
`BuildFromShell` 读到两条语句 → `DetachShell` → 整段体 raw。

改动与 `yield` 完全同构：`IsAwaitFamilyCode` + `AwaitFamilyEndCode`（`await` **没有**受限产生式，
`await⏎x` 仍是 `await x`，所以收口就是表达式语句的 `;` / ASI：`ScanToSemicolonIncremental(code, 1, false, atEof)`），
三处入口各一格（`ComputeByIndex` / 两个 `BuildByIndex` / `TryToClose`）。

效果：`ScanRoot 17940 → 17718`（−222），`RawTail 205 → 197`（−8）；更重要的是 `await` 之后的语句
回到块体目录（`yield` 探针的 `endPath.await` 从 8 变 0）。

### 3.2 标签体挂块体目录（−58 raw）

5d-4 §5 把 `break` / `continue` 那 ~24 条记作「结构性：标签体 `{` 不挂块体目录」。本轮把它做掉：

- `TryMountControlFlowBody` 增加可选参数 `allowLabel`：`ShellLabel` 壳（`lbl: …`）的**体位置**也认——
  `lbl: { … }` 的前一个单元是 `:`、`lbl: while (…) { … }` 的前一个是已闭合 `(…)` 且再往前是
  `while` / `if` / `for` / `with` / `catch`（与六个控制流关键字用的是**同一段**体位置判据）；
- 挂载走既有唯一通道 `MountBodyCatalog` → `BuildBlock` 的 `HasBuiltBodyStatements` / `CollectBodyStatements`，
  **不新增任何建树路径**；
- 新门控 `EnableLabelBodyCatalog`（默认 `true`）+ 计数 `LabelBodyMountCount`（与
  `ControlFlowBodyBraceCount` / `FunctionBodyMountCount` 分开计量）。

效果：`RawTail 197 → 139`（−58），`label-block` / `label-while` / `label-for` / `label-if` 四种形态
`raw+0`（改前 `+1 / +2 / +2 / +1`）。全门零回归（§6），说明「挂上目录只改变谁建体内语句」这条既有
安全论证在标签体上同样成立。

## 4. 前后指标（同一语料逐用例）

语料不变：`files=1763 cases=6300 fileTsInvalid=10 lineSkipped=1269 crash=0`。

| 指标 | 起点 | 终点 | 备注 |
| --- | --- | --- | --- |
| `LegacyStatementDispatchCount` | 0 | 0 | 壳收口路径上没有一条退回 `BuildStatement()` |
| `ScanRootCallCount` | 18124 | **17718** | `yield` −184、`await` −222 |
| `RawTailBuildCount` | 215 | **139** | `yield`/`await` 判界 −18、标签体挂载 −58 |
| `ShapeAstDeclinedCount` | 328 | 328 | 本轮未动 |
| `TotalDeclined`（交叉校验） | 328 | 328 | 与上一行同步 |
| `FileFallbackCount` | 50 | 50 | 增量 0 |

## 5. 剩余 raw 尾巴 139 条（按首单元归族）

`node tests/statement-possible/raw-tail-attribution.mjs`（**新增**，总数与官方指标同源相等）：

| 族 | 条数 | 根因 | 下一步的杠杆 |
| --- | --- | --- | --- |
| `async` | 22 | 体首语句是 `async function` 声明：`Decide` 在**块体里**返回 `Legacy`（5d-3 的根层声明壳只认 `!(Parent instanceof Bracket)`），块体目录没有对应候选 | 与下一行同一个杠杆 |
| `function` | 16 | 体首语句是 `function` 声明：同上（`function` 不在 `IsDeclarationHead`） | **一个杠杆覆盖 22+16+14=52 条**：`Decide` 的块体分支对 `function`/`async`/`@` 返回声明壳路由 + 块体目录补声明族候选（声明壳 + 体挂载一起动） |
| `@` | 14 | 块内装饰器声明：`Decide` 对块体里的 `@` 返回 `Legacy`（5d-3 只放根层） | 同上 |
| `return` | 18 | 函数**表达式**体（`const f = function () { return … }`）没挂目录：`OnChildBracketCreated` 对语句壳上的子括号只认 `=>`（`arrowOnly`），`function (…) {` 被拒 | 放宽那一格（判据：`{` 前是已闭合 `(…)`，再往前是 `function` / `*` / 函数名） |
| `export` | 10 | 块内 `export`（非法位置的恢复形）：`IsDeclarationHead` 有 `export`，但块体里没有声明族候选 | 与 `function` 同一个杠杆（声明族候选进块体目录） |
| `a` / `this` / `const` / `A` / `setup` / … | 20 | **类静态块** `class C { static { … } }` 的体没挂目录（`OnChildBracketCreated` 的类体目录里没有 static block 分支） | 类体括号事件补一条 `static {` 分支 |
| `yield` / `await` | 6 / 3 | 上面几种体的**组合**（函数表达式体里的 `yield`；体首是函数声明、或 `for await (…) {` 的体里的 `await`） | 随各自宿主族一起收 |
| 其它零散 | 30 | `abstract class`（4）、`import`（3）、`#` 私有名（2）、`namespace`（2）、`super`（2）、前缀运算 ASI（`a++; --` ⏎ `a;`）等 | 逐族 |

**为什么停在这里**：剩下 100 条以上都落在两类改动上——① `Decide` 的块体路由（route-util）；
② 新的体挂载点（函数表达式体 / 静态块）。①的收益最大（52 条）但它改的是**每一个含块内 `function`/
`async function`/装饰器声明的用例**的路由，需要单独一轮全门 + 反事实（打开 / 关闭逐字节对拍），
与本轮「判界迁移」混在一轮里无法归因。本轮 9 轮预算在第 7 轮按纪律收尾，不硬塞。

**明确的已知小缺口**（本轮只记录、未修）：`for await (…) { … }` 的体括号没挂上——体位置判据用闭合
`(…)` 往前回看**一格**找关键字，`for await` 的上一格是 `await` 而不是 `for`，于是判据不成立。
修法是回看两格（`await` 再往前是 `for`），影响面很小（归属 `await` 那 3 条里的 2 条）。

## 6. 默认全门读数（最终树，`xl_build` 0 error + `tsc` exit 0 之后实跑）

| 门 | 读数 |
| --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（shapeAst / xmlEqLegacy / astEqTS 各 38/38；knownGap=1 是既有的 `clause-nested-known-gap`） |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46**（不退化） |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**（不退化） |
| `tests/statement-possible/yield-boundary.mjs`（新增） | **56 / 56**，本族 `ScanRoot` 0 次 |
| `tests/statement-possible/raw-tail-attribution.mjs`（新增） | 139 = 139（与官方指标同源） |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 17718 / 139 / 328 / 328 / 50） |

## 7. 风险与注意

1. **三条 `yield` 形状缺口是既有的，本轮没修**（探针里 `astKnownGap`，`EnableYieldStatement` 开/关
   XML 逐字节相同，已实测）：
   - `yield⏎;`：TS 把 `;` 计入同一条 `ExpressionStatement`（`[15,23)`），本实现多出一个 `EmptyStatement`；
   - `yield;⏎yield;` 的第二条：TS 是 `YieldExpression`，本实现建树成 `Identifier`；
   - 生成器内 `yield: 1`：TS 是恢复形（`ExpressionStatement(YieldExpression)` + `ExpressionStatement`），
     本实现是 `LabeledStatement`。
   三条都在**表达式建造器 / 标签建树**这一层（`BuildExpressionStatement` / `BuildExpressionRange` /
   `BuildLabeled`），不在 boundary 层；修它们等于改 legacy 行为，需要单独一轮对拍，本轮按纪律没动。
2. **`EnableLabelBodyCatalog` / `LabelBodyMountCount` 是新的挂载门控**（默认 `true`）。置 `false` 即行为
   逐位回到本轮之前（`RawTail` 回到 197），可用于快速定位「是不是标签体挂载引入的」。
3. **`await` 族现在也不再问 `ScanRoot`**。如果后续要把 `await` 的开 / 关做行为对拍，
   `EnableAwaitStatement=false` 依旧逐位回到 Stage 4k（`AwaitFamilyEndCode` 只在壳存在时被调用）。
4. **剩余 139 条不是判界问题**（§5）：全部是「体首语句没有候选」或「这个 `{` 没挂目录」。
   下一个收益最大的单一杠杆是**块体里的声明族路由**（`function` / `async function` / 装饰器，52 条），
   一次改动覆盖三族，但波及面最大，必须先做打开 / 关闭的逐字节对拍再上全门。
5. **`dist/` / `build/` 是生成物**（gitignored）。复现前必须 `xl_build` + `tsc`，否则 `build/ts` 是旧代码，
   所有探针读数都会对不上。
6. `tmp/` 里的调查脚本（`check-yield.mjs` / `check-yield2.mjs` / `rawtail2.mjs` / `bodies.mjs` /
   `bodies2.mjs` / `counters.mjs` / `why.mjs`）是调查用，**未入库**；正式探针是
   `tests/statement-possible/yield-boundary.mjs` 与 `raw-tail-attribution.mjs`。

## 8. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d6

# 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#   xl_build: paths=["typescript/tokens/statements"]（或 ["core","typescript"]）, targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 指标
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对，应 PASS
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计
node tests/statement-possible/legacy-retirement.mjs --json     # 机器可读（逐用例）
node tests/statement-possible/yield-boundary.mjs               # 本 Stage 的 yield 族探针（56/56）
node tests/statement-possible/yield-boundary.mjs --verbose     # 每条用例的壳数 / ScanRoot 归因
node tests/statement-possible/raw-tail-attribution.mjs --top=20 # 剩余 raw 尾巴归族（总数必须 = 官方）
node tests/statement-possible/raw-tail-attribution.mjs --verbose # 每族多看几个源码片段

# 全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs ; git checkout -- typescript/cases
node typescript/cases/token-ast.mjs --quiet
node typescript/cases/real-dts-ast.mjs
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/declaration-statement-takeover.mjs
node tests/parse/validate.mjs
node tests/statement-possible/final-matrix.mjs
node tests/statement-possible/op-ast-proof.mjs
node tests/statement-possible/op-proof.mjs
node tests/statement-possible/ast-kind-names.mjs
node tests/statement-possible/short-family-boundary.mjs
node tests/statement-possible/control-flow-boundary.mjs

# 回退
git revert --no-edit 7e30f23b   # 先撤基线（否则指标与源码不一致）
git revert --no-edit d1c36234   # 再撤源码
# 或整体：git reset --hard 09ce8d8e（会丢掉两个 commit，谨慎）

# 只回退某一个族（不必改源码，行为逐位回到本轮之前）：
#   yield 判界   : StatementRouteUtil.EnableYieldStatement = false
#   await 判界   : StatementRouteUtil.EnableAwaitStatement = false
#   标签体挂目录 : StatementRouteUtil.EnableLabelBodyCatalog = false
# 然后 xl_build + tsc；指标变化后要重写基线（--write-baseline）才能 PASS。
```
