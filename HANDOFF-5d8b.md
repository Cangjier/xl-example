# HANDOFF-5d8b —— 表达式形状层覆盖收尾（`ShapeAstDeclinedCount` 42 → 9）

分支 `feature/possible-statement-5d8b`，起点 HEAD = **`029aeeac`**（5d-1a/2a/2b/1b/3/4/5/6/7 全部合并后）。
本文件是这一轮的**唯一结论来源**：数字、逐类修法、剩余清单、复现命令。

---

## 1. 结论先行

**`ShapeAstDeclinedCount` 42 → 9**（−33，−78.6%），其余四项指标**一个都没动**
（`LegacyStatementDispatch` 0、`ScanRoot` 388、`RawTail` 139、`FileFallback` 50），默认全门**零回归**
（`ast-json` 6171/6171、`ast-json-diff` 0/0/0、`token-ast` diff=0、`real-dts` 226/226、`harness` 102/0、
`double` 120/0、`takeover` 33/33、`validate` 1720/0、`final-matrix` 38/38、`op-ast` 94/94、`op-proof` 40/40）。

**没有做到 0**：剩 9 条 / 9 个用例，逐条在 §4。其中 **6 条是判界问题**（`a ++b` / `a !b` / `x++ ++y` /
`--` ⏎ `a` / `a` ⏎ `++b` / `asserts x` ⏎ `is string`），**2 条是箭头参数表**，**1 条是 `new new A()()`**。
它们的共同点是「形状层当前口径遇到就放弃」或「根本不在表达式形状层的职责里」，**全部安全退回 legacy**
（`ast-json-diff` 0/0/0 与 `FileFallback` 50 不变就是取证）。

只改了两个允许目录里的三个文件（`+517 / −48`）：

| 文件 | 改了什么 |
| --- | --- |
| `typescript/tokens/expressions/expression-builder.xl.md` | 新增 `ParseExpressionFrom` / `ParseAssignFrom` / `ParseConditionalFrom` / `ParseBinaryFrom`（「左操作数已建好」的同源入口；四个旧方法改为一行委派，legacy 路径逐字不变） |
| `typescript/tokens/statements/statement-operator-body.xl.md` | 类型实参尾巴判据改喂代码单元、`KindAwait`/`KindYield`、类型区域收口（`EndsTypeTail` + `TailEnd`）、换行后的新语句起点、`new { … }` 操作数、条件帧遇逗号、箭头体遇顶层逗号 |
| `typescript/tokens/statements/statement-shape-ast.xl.md` | 类型实参尾巴的续读（`ParseExpressionFrom`）、yield/await 委派、类型断言与箭头按 `TailEnd` 核消费长度 |

**`core/` 一字未动**，`IsAsiBoundary` 函数体未动，没有新开关、没有切开关，没有改语料 / 探针口径。

---

## 2. 前后指标（`tests/statement-possible/legacy-retirement.mjs`，语料 6300 用例不变）

| 指标 | 前（`029aeeac` 基线） | 后（`af453604`） | 差 |
| --- | --- | --- | --- |
| `ShapeAstDeclinedCount` | **42** | **9** | **−33（−78.6%）** |
| `（交叉校验）StatementShapeAst.TotalDeclined` | 42 | 9 | −33（两者始终同步） |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 |
| `ScanRootCallCount` | 388 | **388** | 0 |
| `RawTailBuildCount` | 139 | **139** | 0 |
| `FileFallbackCount` | 50 | **50** | 0 |
| `filesWithAnyLegacy` | 190 | 165 | −25 |
| 逐构造诊断语料（`--snippets`，42 条） | 全 0，仅 `block-function rawTail=1` | 逐条相同 | 0 |

基线由 `--write-baseline` **单独一次提交**（`189deef9`），body 里写了前后与剩余清单；复跑 verdict **PASS**。

---

## 3. 逐类修法与验证（起点 42，消 33）

每条都用三路证据验：`ast-json`（6171 夹具逐字节）、`ast-json-diff`（结构 / 位置 / 字段三类差）、
`token-ast`（1706 例 diff=0）；形状层自己的证据是 `StatementShapeAst.TotalShapeAst`（`> 0` 才算「AST 确实
由形状树建出」）与 `op-ast-proof` 的 94 条结构文本。

### 3.1 类型实参尾巴之后接运算符（消 14）

源码：`a<b> as T` / `a<b> satisfies T` / `a<b> instanceof C` / `a<b> in c` / `a<b>`t` as T` /
`a<b>?.[0] as any` / `f < g > (a)` / `a < b && c > (d)`。

- **判据侧**：`TryTypeArgumentTail` 原来把**壳的 raw 单元**交给 `AngleJudge.CanStart`，而壳的 `Data` 里夹着
  `WrapSymbol`（空白块，`IsTriviaToken`），`FollowerAllows` 读的是 `>` 之后**那一格**——于是
  `a<b> as T` 的 follower 读到空白而不是 `as`，同一个判据白白判否。现在先滤出**代码单元**
  （`code` + `codeIndexes` 下标映射），判据本身**一个字没改**（它本来就只服务
  `ExpressionBuilder.Units`，那份本来不含 trivia）。TS 对空白不敏感（`f < g > (a)` 就是泛型调用），
  所以这同时是**语义订正**而不只是放宽。
- **AST 侧**：`ParsePostfixSuffix` 只管后缀，读到 `as` / `instanceof` / `&&` 就停。收口器在它之后用新的
  `ParseExpressionFrom(value, firstIndex)` 继续读——那是 `ParseExpression` 的「左操作数已建好」入口，
  与 `ParseAssignFrom` / `ParseConditionalFrom` / `ParseBinaryFrom` 共用同一段赋值 / 条件 / 二元 / 逗号
  逻辑（节点、`Pos`、区间因此与 legacy 同源）。仍要求**恰好**吃到语句末单元，否则判否回 legacy。
- **`a < b && c > (d)` 单独一条**：`HasTypeArgumentCall` 原来只问「宽松扫描 `AmbiguousTypeArguments`」
  （不认识的符号原样跳过，`&&` 因此被无视），它会把比较链判成泛型调用并整条放弃。现在**同时**要求
  `AngleJudge.CanStart` 成立（legacy `ParsePostfix` 用的就是这条严格判据），于是这条比较链**由形状树接管**。

### 3.2 `yield` / `await` 作为操作数（消 8）

源码：`x = yield y` / `x = yield` / `a = yield yield 2` / `x ? await a : await b` / `(yield 1) + 2` /
`(await a).b` / `(await import("m")).default`。

- 新增 `KindYield`(33) / `KindAwait`(32)：`Data = [操作数]`（可空）、`Raw` = 关键字单元。
- **「有没有操作数」在收口时定**（`AttachDanglingAwaitYield`）：壳是**逐格**喂单元的，读到 `yield` 那一格时
  `y` 还不存在（`x = yield y` 先看到 `[x, =, yield]`）——第一版按「看不到就是没有操作数」判，直接把 `y`
  挤到语句外（`x = yield y` → decline「与形状树不一致」）。所以这一格统一当**前缀**压栈，收口时还挂着的
  才是真的没有操作数。`yield yield 2` 靠同一条前缀路径自然嵌套成 `yield(yield(2))`。
- **判型不在这里**：AwaitExpression / YieldExpression / 普通 Identifier 是**上下文判据**
  （`IsAwaitExpressionStart` / `ParseYield` 的 generator 上下文 + lookahead + 换行），只有
  `ExpressionBuilder.ParseUnary` 有一份。收口器把关键字那一格交给它，再核「消费末单元 === 本节点声明的
  末单元」。`x = yield`（TS 判成 **Identifier**，不在 generator 里）与 `a = yield yield 2` 因此共用一条路。
- `InsertionPoint` 把 `KindAwait` / `KindYield` 当**透明前缀**穿过，所以 `await a.b` 是 `await(a.b)`、
  `yield a.b` 是 `yield(a.b)`（与 TS 一致）。

### 3.3 类型之后还有表达式（消 2）

源码：`a as T + b` / `a ? b as T : c`。

- 原来 `ExpectTypeTail` 把 `as` 之后**全部**单元吞进类型区域，`+ b` / `: c` 因此被当成类型的一部分，
  收口器又要求「类型必须吃到语句末尾」——两种长度对不上，一律判死。
- 现在 `EndsTypeTail` 在**类型里绝不可能出现**的那一格收口：`+ * / % && || ?? =`、尖括号深度 0 的 `,`、
  **未出现过 `?`** 时的 `:`、`instanceof` / `in`。随后把类型断言帧标完整、`Expect` 回操作符位，并**重新**
  按运算符处理这一格（`a ? b as T : c` 的 `:` 于是交给 `CloseConditional`）。`as` / `satisfies` **不**在这里断，
  链式断言 `a as T as U` 仍留在同一格里由收口器逐层包（与 legacy 左结合同形）。
- 句子节点新增 `TailEnd`（类型区域末单元）：收口器不能从 `Data` 推出「本节点到哪结束」（类型不进树），
  这一格把它显式记下来，`ParseFollowingType` 必须恰好消费到它。
- **踩过的坑（留证）**：只把「必须吃到末尾」改成「必须吃到 `claimedLast+1`」而 `claimedLast` 取的是
  **操作数**的末单元，结果 `a as T` 全员 decline（42→94 的假回归）。`TailEnd` 就是为了修这个语义错。

### 3.4 换行之后出现新语句的起点（消 4）

源码：`typeof (x)` ⏎ `void (0)` ⏎ `delete (obj.k)`（`am-keyword-call`）、`a.class` ⏎ `{}`、
`"use strict"` ⏎ `function f(){…}`。

- 壳把**整条语句壳的单元**喂给本体，而本体不知道 ASI 边界：`void` 在 `ExpectOperator` 位上一律
  `Fail("运算符 void")`，本体从此不完整——可 AST 判界（`BuildExpressionStatementFromShapes`）本来就是对的，
  于是一条本可以接管的语句白白退回 legacy。
- 新增 `StartsNextStatement`：`ExpectOperator` 位 + **与前一个代码单元之间有换行**
  （`LineTerminator.HasBetween`，与判界层同一份行终止符口径）+ 这一格是**续不上表达式**的语句起点
  （`IsStatementStartKeyword` 的关键字集合，或一个 `{`）⇒ `Closed = true`（表达式到此为止，**不算未实现**）。
  方向保守：判成「新语句」只是提前收口，壳的判界若不同意，`Covers` 会判否、整条回 legacy。

### 3.5 `new { … }()`（消 1）

- `BuildOperand` 里 `{` 的守卫是「顶层 `{` 是块体边界，不解释」。但 `new` 的**被构造者**位上的 `{` 是对象
  字面量（`new { a: 1 }()`）。新增 `AwaitNewCallee`：只认「栈顶前缀正是还没挂子节点的 `KindNew`」这一种形态，
  别处顶层 `{` 仍然不解释。

### 3.6 条件与逗号的分层（消 1）

- `a ? b : c, d` 在 TS 里是 `(a ? b : c), d`；原逻辑见条件帧就 `Fail("条件表达式与逗号的分层")`。
  现在先把**已经闭合**的条件帧 `CompleteTop` 收掉（循环，嵌套条件同理），再让逗号走普通运算符路径；
  条件帧还在等分支（`a ? b, c`，非法）时照旧判不完整、整条回 legacy。

### 3.7 箭头体之外的逗号（消 2）

源码：`async (a) => a, async b => b` / `async () => await a, async (b) => await b`。

- `ExpectArrowTail` 原来的口径是「箭头体整段吞掉」，于是逗号与第二个箭头也被吞进体里，而 legacy 的
  `ParseAssign` 建完箭头就返回（逗号属于外层 `ParseExpression`）——长度对不上，判否。
- 现在 `,` **在箭头体之外**：收口（`Expect` 回操作符位）并让这一格按普通逗号运算符处理。
  `x => (a, b)` / `x => f(a, b)` 的逗号在括号单元内部，不是独立单元，不受影响。
  箭头节点同时记 `TailEnd`（体末单元），收口器核 `ParseAssign` 的消费长度。

### 3.8 顺手修掉的同类隐患（不单独计数）

类型区域 / 箭头体里的 `<` 不再置 `SawLessThan`：否则 `a as A<B>` 收口时会被「类型实参尾巴」重放
（`TryTypeArgumentTail`），而重放停在 `as` 处 → 本体只剩半条 → 本来 5d-7 就接管的 `a as A<B>` /
`a satisfies A<B>` 一起失守（本轮中途实测出现过这 27 条假回归，改完即恢复）。

---

## 4. 剩余清单（9 条 / 9 个用例）与原因

按「用例 + 最终拒绝原因」逐条量出（`tmp/decline-cases.mjs`，调查用，未入库）。

| # | 族 | 条数 | 源码 | 为什么没做（诚实原因） |
| --- | --- | --- | --- | --- |
| 1 | **ASI 前后缀混排** | 5 | `a ++b`（end-compute L383）/ `a !b`（L385）/ `x++ ++y`（L394）/ `--` ⏎ `a`（prefix-operand-newline）/ `a` ⏎ `++b`（stmt-asi-prefix） | 这些是**判界**问题（`++` / `!` 归哪条语句、`--` 与操作数跨换行），不是形状树缺节点：本体按「后缀」建成 `post(a)`，而语句单元里还留着下一格，`Covers` 判否。改判界属 5d-5 的 `ScanRoot` 归零范畴，且 `IsAsiBoundary` 函数体本轮明令不动 |
| 2 | **声明族边界** | 1 | `asserts x` ⏎ `is string`（gap-r931） | 声明类型谓词被换行切开，语句边界归声明族扫描器判；不在表达式形状层的职责里 |
| 3 | **箭头参数表** | 2 | `((x: any): x is A => true)`（expression L704）/ `(function <T>(x: T) { return x; })(1)` | 参数表要能带**类型标注 + 返回类型谓词**（`x is A`）与**泛型函数表达式的括号参数表**：前者要把「未解析参数表」升级成能带类型的形状节点，后者是 `(function <T>…)` 的括号内体在 `function` 与 `<` 之间就要判型；与 5d-3/5d-4 的箭头体/函数体委派口径冲突，需单独设计 |
| 4 | **`new` 的嵌套被构造者** | 1 | `new new A()()`（expression L107） | `KindNew` 目前**整格委派** `ParseNew()`（不递归建子节点），`new new A()()` 的 `ParseNew` 一次吃完全部单元，与形状树「外面还有一个调用」的结构长度对不上。要修得让 `KindNew` 像 `KindArrow` / `KindTypeAssert` 一样按 `TailEnd` 核区间——但 `new` 的子节点不建树，末单元没有来源，需要先给 `KindNew` 也补一格「被构造者末单元」 |

**它们全部是「安全退回」**：`ast-json-diff` 0/0/0、`token-ast diff=0`、`FileFallback 50` 不变，
说明这 9 条的 AST 仍与 legacy 逐字节相同。**没有为了降数字改语料 / 改探针口径 / 关开关。**

另外记录：`tests/statement-possible/shape-ast-coverage.mjs`（5d-7 新增）仍是 **cases=50 pass=46 known=4
fail=0**——4 条 `known` 与上面剩余清单里的「箭头参数表（`(a: A) => a` 一族）」「语句起点的 `#`」是同一份，
本轮**没有**把 `known` 改成 `pass`（也没有把失败改绿）。

---

## 5. 全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树 `af453604`）

| 门 | 读数 | 与基线 |
| --- | --- | --- |
| `typescript/cases/ast-json.mjs` | **6171 / 6171**（47 构造，cj-fail 0） | 一致 |
| `typescript/cases/ast-json-diff.mjs` | **6171 / 6171**，结构差 0 / 位置差 0 / 字段差 0；`git status --porcelain typescript/cases` 空 | 一致 |
| `typescript/cases/token-ast.mjs --quiet` | total=1716 **ok=1706 crash=0 diff=0**，ts-invalid=10，known-gap=0 | 一致 |
| `typescript/cases/real-dts-ast.mjs` | **226 / 226**，崩溃 0、差异 0 | 一致 |
| `tests/statement-possible/harness.mjs --all` | **102 pass / 0 fail / known=0 / uncovered=0 / file-fallback=0** | 一致 |
| `tests/statement-possible/harness.mjs --double-accept` | **120 / 0**，冲突 0 | 一致 |
| `tests/statement-possible/declaration-statement-takeover.mjs` | **33 / 33**，knownGap=0，takeover=27 | 一致 |
| `tests/parse/validate.mjs` | **1720 条 / 0 条不合格** | 一致 |
| `tests/statement-possible/final-matrix.mjs` | **38 / 38**（`shapeAst` / `xmlEqLegacy` / `astEqTS` 各 38/38，knownGap=1 既有 `clause-nested-known-gap`） | 一致 |
| `tests/statement-possible/op-ast-proof.mjs` | **94 / 94** | 一致（没有下降） |
| `tests/statement-possible/op-proof.mjs` | **40 / 40** | 一致 |
| `tests/statement-possible/ast-kind-names.mjs` | **PASS**（live 5/5、self-test 4/4、fixtures 47、运算符节点 262、fail=0） | 一致 |
| `tests/statement-possible/short-family-boundary.mjs` | **46 / 46** | 一致 |
| `tests/statement-possible/control-flow-boundary.mjs` | **85 / 85**，knownGap=1（不退化） | 一致 |
| `tests/statement-possible/shape-ast-coverage.mjs` | cases=50 pass=46 known=4 fail=0 | 一致 |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 388 / 139 / **9** / 9 / 50） | 指标下降 |

---

## 6. 复现与回退

```powershell
# 0) 目录
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d8b

# 1) 生成 + 编译（改了 .xl.md 之后必须按这个顺序）
#    xl_build: cwd=本目录, targets=["ts"], out="dist"
#    paths 只给改动文件最快（依赖的 .ts 已是最新）；要给全量就用 ["core","typescript"]
#    xl_build: paths=["typescript/tokens/statements/statement-operator-body.xl.md",
#                     "typescript/tokens/statements/statement-shape-ast.xl.md"]
node node_modules/typescript/bin/tsc -p tsconfig.json    # 必须 exit 0

# 2) 指标（前后四项 + 交叉校验）
node tests/statement-possible/legacy-retirement.mjs --json        # totals: 0 / 388 / 139 / 9 / 9 / 50
node tests/statement-possible/legacy-retirement.mjs               # verdict: PASS（对 189deef9 的基线）
node tests/statement-possible/legacy-retirement.mjs --snippets    # 42 条逐构造读数（应与 5d-7 逐条相同）

# 3) 逐条归因（调查用；tmp/ 未入库，需要时重写一个）
node tmp/decline-cases.mjs        # 逐用例打出「源码 + 最终拒绝原因」，本轮 9 条
node tmp/tree.mjs  "<源码>"        # 单条：形状树文本 / shapeAst / declined / 原因
node tmp/ts-tree.mjs "<源码>"      # 对照 TS 自己的 AST（判定「应该是什么形状」）

# 4) 全门
node typescript/cases/ast-json.mjs | Select-Object -Last 2
node typescript/cases/ast-json-diff.mjs | Select-Object -Last 2
node typescript/cases/token-ast.mjs --quiet | Select-Object -Last 3
node typescript/cases/real-dts-ast.mjs | Select-Object -Last 2
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
node tests/statement-possible/shape-ast-coverage.mjs
```

回退：

```powershell
# 只回退本轮源码（保留基线）：把三个文件退回 029aeeac
git checkout 029aeeac -- typescript/tokens/expressions/expression-builder.xl.md `
  typescript/tokens/statements/statement-operator-body.xl.md `
  typescript/tokens/statements/statement-shape-ast.xl.md
# 连基线一起回退（整条分支回到起点）
git reset --hard 029aeeac
# 然后重跑步骤 1) 的 xl_build + tsc，再跑 2) 的探针（旧基线下应为 42）
```

本轮提交（分支 `feature/possible-statement-5d8b`，未 push）：

```
189deef9 test(5d-8b): 形状层覆盖收尾后的退场指标基线
af453604 refactor(expressions): 形状层覆盖收尾（Declined 42→9，Stage 5d-8b）
029aeeac test(5d): 5d-5/6/7 合并后的退场指标基线   ← 起点
```

---

## 7. 风险与注意

1. **`ParseBinaryFrom` 一族的同源性**：四个旧方法现在都是一行委派（`ParseBinary` → `ParseUnary` +
   `ParseBinaryFrom`），legacy 调用路径的语句顺序与原来逐字相同；`ast-json` 6171 逐字节一致是取证。
   但仍有一条**语义**要注意：`ParseExpressionFrom(left, start)` 的 `start` 由调用方给（收口器给的是
   `firstIndex`），跨度因此与「左操作数自己建出来的树」同源——给错会让 `Pos` / 区间漂移，
   `ast-json-diff` 的位置差会立刻报出来。
2. **`TailEnd` 是本轮的新不变式**：`KindTypeAssert` 与 `KindArrow` 的收口都靠它核「legacy 消费长度」。
   以后若给别的 Kind 加「整段委派」，建议同一口径（记末单元 + 核 `after === tailIndex + 1`），
   否则就会退化成「委派吃太多 / 太少」而没有任何门能抓住。
3. **换行后的收口（`StartsNextStatement`）是保守判据**：关键字集合刻意不含 `as` / `satisfies` /
   `instanceof` / `in` / `await` / `yield`。往集合里加词只会**多收口**（`Covers` 会兜住错误），
   但去掉词会让 3.4 那 4 条重新退回 legacy。
4. **`yield` / `await` 的判型依赖 legacy 的上下文判据**：`EnclosingFunctionFlags` 沿原文往回扫函数边界，
   所以「同一段源码在 `function*` 里还是顶层」这种事实只有 legacy 知道。收口器只核长度，
   **不重写**判型——这正是 `(yield 1) + 2` 与 `x = yield`（Identifier）两条都能对上的原因。
5. **剩余 9 条不要「顺手」放宽**：ASI 那 5 条一旦靠形状层猜判界，`ScanRoot` / `RawTail` 会动，
   属于 5d-5 的口径问题；箭头参数表那 2 条要动 5d-3/5d-4 的委派口径。两条都超出「表达式形状覆盖」的范围。
