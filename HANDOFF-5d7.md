# HANDOFF-5d7 —— 表达式形状层覆盖收尾（`ShapeAstDeclinedCount`）

分支 `feature/possible-statement-5d7`，起点 HEAD = **`09ce8d8e`**（5d-1a/2a/2b/1b/3/4 合并后）。
本文件是这一轮的**唯一结论来源**：数字、归类、剩余清单、复现命令。

---

## 1. 结论先行

**`ShapeAstDeclinedCount` 328 → 42（−286，−87.2%）**，其余四项指标**一个都没动**
（`LegacyStatementDispatch` 0、`ScanRoot` 18124、`RawTail` 215、`FileFallback` 50），
默认全门**零回归**（`ast-json-diff` 0/0/0、`token-ast` diff=0、`real-dts` 226/226、`harness` 102/0…）。

补上的形状层覆盖分四类，全部只在两个文件里（`statement-operator-body.xl.md` + `statement-shape-ast.xl.md`）：

| 类 | 新形状节点 | AST 侧的建法（与 legacy 同一个调用） | 消掉的条数 |
| --- | --- | --- | --- |
| **标签模板**（任何被标宿主） | `KindTaggedTemplate`（27） | `ParseTemplateToken` + `TaggedTemplateExpressionShape` | **~121** |
| **类型断言** `as` / `satisfies` | `KindTypeAssert`（28） | `ParseFollowingType` + `As/SatisfiesExpressionShape` | **~74** |
| **类型实参**（调用 / 实例化 / `?.<T>`） | `KindTypeArguments`（30） | `ParsePostfixSuffix` | **~100** |
| `super` / `new.target` / 私有名 | `KindKeyword`(super) / `KindNewTarget`(29) / `KindPrivateName`(31) | `SuperKeywordShape` / `ParseNew` / `PrivateIdentifierShape` | **~50** |

（`~` 是因为四类的条数在修的过程中互相解锁：标签模板修好之后 `as` 族的条数从 39 涨到 59，
所以 328 − 四类之和 ≈ 42 的差额不能按行相加；下面 §2 给的是**实测前后**，§3 给的是**起点归因**。）

**没有做到 0**：剩 42 条 / 34 个用例，逐条在 §5。它们的共同点是「形状层要么不解释最后一截、要么整条不归我们管」，
全部**安全退回 legacy**（不是建错树）：`ast-json-diff` 0/0/0 与 `FileFallback` 50 不变就是取证。

---

## 2. 前后指标（`tests/statement-possible/legacy-retirement.mjs`，语料 6300 用例不变）

| 指标 | 前（`09ce8d8e` 基线） | 后（本轮） | 差 |
| --- | --- | --- | --- |
| `ShapeAstDeclinedCount` | **328** | **42** | **−286（−87.2%）** |
| `（交叉校验）StatementShapeAst.TotalDeclined` | 328 | 42 | −286（两者始终同步） |
| `LegacyStatementDispatchCount` | 0 | **0** | 0 |
| `ScanRootCallCount` | 18124 | **18124** | 0 |
| `RawTailBuildCount` | 215 | **215** | 0 |
| `FileFallbackCount` | 50 | **50** | 0 |
| 仍有 legacy 读数的用例 | 6297/6300 | 6297/6300 | 0 |

逐构造诊断（`--snippets`，42 条最小源码）**没有一条变化**：本轮的改动都落在「非标识符宿主 / 类型位」上，
`expr-binary` / `expr-call` / 控制流 / 声明族这些既有族的读数与基线逐条相同。

---

## 3. Top declined 归类（起点 328，按 `StatementShapeAst.LastDeclineReason` 归因）

归因方法是 `tmp/decline-units.mjs`（调查用，未入库）：包一层 `StatementOperatorBody.prototype.Fail`，
把「失败时的单元序列 + 原因」逐条记下来，再按源码形态归类。

| 起点原因（`Fail` 文本） | 条数 | 真实构造（举例） |
| --- | --- | --- |
| `表达式体不完整（单元）` | 123 | **标签模板的模板串单元落在操作数位置之后**：`tag`t`` / `a!`t`` / `[a,b]`t`` / `/re/g`t`` / `new C()`t`` / `import.meta`t`` / `a?.b()`t``；另有 1 条是 `a.class` 换行裸块 |
| `类型实参调用` | 41 | `f<T>(1)` / `o.m<T,U>(x)` / `new C<T>()` / `a<b>?.[0]` |
| `运算符 as` | 39 | `a as T` / `x as T as U` / `[1,2] as const` / `(x as any).y` |
| `操作数 ?.` | 24 | `a<b>?.[0]` / `a<b>?.(1)`（实例化表达式 + 可选链） |
| `操作数 super` | 16 | `super()` / `super.m()` / `super[k]` |
| `操作数 .` | 15 | `new.target`（`new` `.` `target` 三格） |
| `运算符 satisfies` | 12 | `a satisfies T` / `x as const satisfies T` |
| `圆括号参数表后面不是 =>` / `里的逗号` / `冒号没有对应的条件表达式` / `操作数 ...` | ~30 | 箭头函数的**带类型标注 / 默认值 / 展开**参数表 |
| `成员名不是标识符` + `操作数 #` | 19 | `this.#x` / `obj.#x` / `#x in obj` |
| `操作数 yield` / `操作数 await` | ~8 | `x = yield y` / `x ? await a : await b` |
| 其余零散 | ~11 | `typeof (void …)` / `new new A()()` / `a ++b` / `a ? b : c, d` 等 |

**订正**：`docs/possible-statement-5d-plan.md` §9.4 当时按**文件**聚类，猜「标签模板被标宿主判据太窄」。
事实是**没有「被标宿主判据」这个东西**：`KindTaggedTemplate` 走的是成员 / 调用 / 非空断言那条通用
`InsertionPoint` 插入路径，缺的只是「模板串单元在 ExpectOperator 里该建哪一格」。§9.4 的猜测已在本轮
同一文件 §10.1 里改掉。

---

## 4. 每一类的修法与验证

所有改动都在允许范围内：`typescript/tokens/statements/statement-operator-body.xl.md`、
`typescript/tokens/statements/statement-shape-ast.xl.md`（+ 新增探针 + 文档）。**`core/` 一字未动**，
`IsAsiBoundary` 函数体未动，没有新开关，没有切开关。

### 4.1 标签模板（`KindTaggedTemplate`，消 ~121）

- **形状侧**：`Ingest` 的 `ExpectOperator` 分支新增一格——`String` 单元且 `IsTemplateUnit` → `StartTaggedTemplate`。
  它走**与成员 / 调用 / 非空断言同一条插入路径**（`InsertionPoint` + `ShapeInsertUtil.InsertBetween`）：
  当前表达式原地变成新节点的 `Data[0]`。**这就是为什么「非常规宿主」不需要各自判据**：`a!` / `[a,b]` /
  `new C()` / `a?.b()` / `(a)` / `String.raw` 在读到模板串之前**已经作为形状节点在树上**。
- **AST 侧**：`BuildNode` 先建标签（递归），再 `builder.At = 模板单元下标` 调 `ParseTemplateToken()`，
  外层 `TaggedTemplateExpressionShape`（children = 标签、模板；`Pos` = 标签的 `Pos`；
  区间 = 首单元 → 模板单元），与 `ExpressionBuilder.ParsePostfixSuffix` 的模板分支**逐字段同源**。
- **留了一格保守**：`a<T>`t``（类型实参 + 模板）由既有 `AmbiguousTypeArguments` 判据（`>` 后紧跟模板串即
  判类型实参）整条放弃 → 仍然安全退出（`Unit` 侧的 `HasTypeArgumentCall` 也认它）。
- **验证**：探针 `shape-ast-coverage` 的 `tagged-template` 组 13/13（`!` / 数组 / 正则 / `new C()` /
  `?.` 链 / `import.meta` / `new.target` / 后接 `as` / 后接 `.b` / 括号内）。

### 4.2 类型断言 `as` / `satisfies`（`KindTypeAssert`，消 ~74）

- **形状侧**：`ExpectOperator` 见 `OperatorTable.IsAsOperator(text)`（与 `ExpressionBuilder.IsTypeOperator`
  同一判据）→ `StartTypeAssert`：**按二元运算符的插入路径**建一格 `KindTypeAssert`
  （优先级 `OperatorTable.AsPrecedence`，先按优先级弹栈），随后进新的 `ExpectTypeTail` 把 `as` 之后的
  单元全部吞掉（`TypeTailUnits` 计数）。
  **为什么不能像 `!` 那样包住最后一个操作数**：`a + b as T` 在 TS 里是 `(a + b) as T`，
  包住 `b` 会建出 `a + (b as T)`——`ast-json-diff` 的 `expression` 夹具 #293 立刻报位置差
  （`AsExpression[0,10]` vs `[3,10]`）。这一条是本轮**唯一一次被现有门抓住的实质错误**，写在这里留证。
- **AST 侧**：左边仍是形状树的节点；从 `as` 之后交给 legacy `ParseFollowingType()`，外层
  `AsExpressionShape` / `SatisfiesExpressionShape`，链式断言在循环里逐层包（与 legacy 的左结合一致）。
  **安全条件**：类型必须**恰好**吃到最后一个单元（`after === builder.Units.length`），
  否则拒绝接管（`a as T + b` 这种「类型之后还有表达式」的情形就不接管）。
- **验证**：探针 `type-assert` 组 13/14 PASS + 1 KNOWN；`ast-json` 的 `expression` / `type-assertions`
  夹具逐字节一致。

### 4.3 类型实参（`KindTypeArguments`，消 ~100，含 `?.` 链）

- **判据**：`AngleJudge.CanStart`（前驱 + 严格配对 + follower 白名单）——`<` 是小于号还是类型实参表的
  **唯一**判据，没有第二份。
- **为什么要「重放」**：判据要看 `<` 的配对 `>` 与它之后的 follower，而壳是**逐格**喂单元的（读到 `<`
  那一格后面还没有单元）。所以根层壳的类型实参尾巴**推迟到 `Finish`**（收口时 `Units` 是整条语句的
  全部单元；`Finish` 是 `StatementShape.BuildFromShell` 在 `IngestAll` 之后调的那一次），
  嵌套体（括号 / 索引内部）则在 `IngestAll` 里直接判——它们的 `Units` 就是括号 `Data`，一次给全。
  判成类型实参后：`ResetState()` 把摄入状态清空、`ReplayUntil(<前)` 重放前缀（**重放是必要的**：
  此时前缀可能已经被 `<` / `?.` 弄脏）、把整段左表达式包成一格、停在 `Closed`。
- **AST 侧**：`<` 之后整段交给 `ParsePostfixSuffix`（类型实参调用 / 实例化表达式 / `?.<T>(…)` 的**唯一**
  实现），并要求它**恰好**吃到最后一个单元。`a?.<T>(b)` 的尾巴从 `?.` 那一格起（legacy 在
  `ParsePostfixSuffix` 的 `?.` 分支里建它的类型实参）。
- **明确排除 `new X<T>()`**：类型实参属于 `NewExpression`（legacy 在 `ParseNew` 里建），
  `ParsePostfixSuffix` 会把它建成「对 `new` 结果的调用」，树不同形 → 前缀若是还开着的 `KindNew`，判否。
- **验证**：探针 `type-arguments` 组 10/12 PASS + 2 KNOWN（`a<b> as T` / `a<b> instanceof C`）；
  `a < b` 这种真比较**仍然被形状树接管**（`ta-comparison-stays` PASS，证明判据没有被放宽）。

### 4.4 `super` / `new.target` / 私有名（消 ~50）

- **`super`**：`BuildOperand` 加一格关键字叶子（`KindKeyword`，`Text="super"`），AST 侧用 legacy 的同一
  工厂 `MakeKeywordLeaf(new SuperKeywordShape(...))`（= `ParsePrimary` 的 super 分支）。`super()` /
  `super.m()` / `super[k]` 由随后的普通后缀接上。
- **`new.target`**：`new` 之后紧跟 `.`、而 `new` 还没等到被构造者时，`StartNewTarget` 把那个 `KindNew`
  前缀节点改写成 `KindNewTarget`（`Raw`=`new`，`Args`=`.`，`Data=[target]`），`AwaitMeta` 让名字到达后
  把它当**操作数**挂进当前帧；AST 侧整格交给 `ParseNew()`（它对 `new . target` 本来就有专门分支）。
- **私有名**：token 层把 `#x` 拆成 `Symbol "#"` + `Common "x"` 两格，形状侧用 `KindPrivateName`
  （`Raw`=`#`，`Data=[名字]`）合成一格；AST 侧 `PrivateIdentifierShape` 的
  `SignInToken(#)` / `SignOutToken(x)` / `Pos=Positions[#]` 与 legacy 的私有成员分支逐字段同口径。
  成员位（`this.#x`）与操作数位（`#x in obj`）共用这一格。成员名也不再用 `IsOperandText` 挡关键字
  （`obj.as` / `obj.true` 在 TS 里是合法属性名，legacy `ParseName` 照收；只挡数字 / 大整数）。
- **验证**：探针 `keyword-leaf` 6/6、`private-name` 4/5 PASS + 1 KNOWN（语句起点的 `#`，见 §5）。

### 4.5 新增专用探针

`tests/statement-possible/shape-ast-coverage.mjs`（50 例，5 组：`tagged-template` 13 / `type-assert` 14 /
`type-arguments` 12 / `keyword-leaf` 6 / `private-name` 5）。每条断言三件事：

1. `StatementShapeAst.TotalShapeAst >= 1`（AST **确实由形状树建出**，不是「恰好没红」）；
2. `TotalDeclined === 0`（本类没有被拒绝的正面证据）；
3. 默认档 `ToXmlString()` 与 legacy 档（`EnableShellExpressions=false`）**逐字节相同**。

第 3 个元素标 `known` 的用例是**已知未覆盖**：断言换成「XML 仍与 legacy 相同，且不得出现
`shapeAst>0 && declined>0`（半棵树）」，`known=` 单独计数。**这不是把失败改绿**：
`known` 清单与 §5 的剩余清单是同一份，`pass` 计数里不含它们。

---

## 5. 剩余清单（42 条 / 34 个用例）与原因

按「用例 + 最终拒绝原因」逐条量出（`tmp/decline-cases.mjs`，调查用，未入库）。

| # | 族 | 条数 | 代表源码 | 为什么没做（诚实原因） |
| --- | --- | --- | --- | --- |
| 1 | **实例化表达式后面接运算符** | 14 | `a<b> as T` / `a<b> instanceof C` / `a<b>?.[0]` / `a<b>`t`` / `a < b && c > (d)` / `f < g > (a)` | `ParsePostfixSuffix` 只管**后缀**，读到 `as` / `instanceof` / `&&` 就停；要收它得在「类型实参尾巴」之上再叠一层表达式解析（或让 `as`/`instanceof` 与它走同一段 legacy），属新机制 |
| 2 | **箭头函数参数表** | ~10 | `((x: any): x is A => true)` / `async (a) => a, async b => b` / `(a: A) => a` | 参数表的类型标注 / 默认值 / 展开 `...` 要把「未解析参数表」升级成能带类型的形状节点；与 5d-3/5d-4 的箭头体委派口径冲突，需单独设计 |
| 3 | **`yield` / `await` 作为操作数** | 6 | `x = yield y` / `x = yield` / `x ? await a : await b` / `(yield 1) + 2` | `yield` / `await` 是「受限产生式 + 上下文关键字」，形状层放在**语句**族（5d-4 的 `YieldStatementPossibleShape`），表达式位还没有节点；补要动语句/表达式两侧的判据归属 |
| 4 | **ASI 边界的前后缀混排** | 7 | `a ++b` / `a !b` / `x++ ++y` / `--` ⏎ `a` / `a.class` ⏎ `{}` / `declare … is` ⏎ | 这些是**判界**问题（`++`/`!` 属于哪条语句），不是形状树缺节点；改判界属 5d-5 的 `ScanRoot` 归零范畴，本轮不动 |
| 5 | **`new` 的非常规形态** | 2 | `new { a: 1 }()` / `new new A()()` | `new` 后面直接是花括号 / 又一个 `new`：`ParseNew` 已能建，但形状侧在 `ExpectOperand` 就把 `{` 判成对象字面量守卫、把第二个 `new` 判成前缀栈里的嵌套，两者都需要在 `KindNew` 里再分型 |
| 6 | **零散** | 3 | `typeof (void …)` / `void (delete …)`（`am-keyword-call`）、`a ? b : c, d`、`a ? b as T : c`、`a as T + b` | 关键字链的优先级 / 条件与逗号的分层 / 类型之后还有表达式：都是「一次只读一截」的结构，形状层当前口径是**遇到就放弃**（保守方向，legacy 仍对） |

**它们全部是「安全退回」**：`ast-json-diff` 0/0/0、`token-ast diff=0`、`FileFallback 50` 不变，
说明这 42 条的 AST 仍与 legacy 逐字节相同。**没有为了降数字改语料 / 改探针口径 / 关开关。**

另有 1 条**不算 decline 但同样没覆盖**的形态（探针里以 `known` 记录）：
**语句起点的 `#`**（`#x in o;` 不带括号）——缺口不在形状树（操作数位的私有名已经能建），
而在「块体目录 / 路由把 `#` 认成表达式语句起点」，本轮改动范围不含路由判据。

---

## 6. 全门读数（`xl_build` 0 error + `tsc` exit 0 之后实跑，最终树）

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
| `tests/statement-possible/shape-ast-coverage.mjs`（**新**） | **cases=50 pass=46 known=4 fail=0** | 新增 |
| `tests/statement-possible/legacy-retirement.mjs` | **PASS**（基线已更新为 0 / 18124 / 215 / 42 / 42 / 50） | 指标下降 |

---

## 7. 复现与回退

```powershell
cd C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-5d7

# 1) 生成 + 编译（改了 .xl.md 之后必须按这个顺序；xl_build 用工具，cwd=本目录）
#    xl_build: paths=["core","typescript"], targets=["ts"]
node node_modules/typescript/bin/tsc -p tsconfig.json

# 2) 指标（前后四项 + 交叉校验）
node tests/statement-possible/legacy-retirement.mjs            # 与基线比对，应 PASS
node tests/statement-possible/legacy-retirement.mjs --quiet    # 只看总计
node tests/statement-possible/legacy-retirement.mjs --json     # 机器可读（逐用例）
node tests/statement-possible/legacy-retirement.mjs --snippets # 42 条逐构造读数（应逐条不变）

# 3) 本轮专用探针（已入库）
node tests/statement-possible/shape-ast-coverage.mjs           # 50 例：pass=46 known=4 fail=0
node tests/statement-possible/shape-ast-coverage.mjs --json    # 机器可读

# 4) 全门
node typescript/cases/ast-json.mjs
node typescript/cases/ast-json-diff.mjs
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

# 5) 归因（调查用，tmp 未入库；依赖 build/ts）
node tmp/decline-units.mjs   # 逐「原因 + 单元序列」
node tmp/decline-cases.mjs   # 逐用例最终原因
node tmp/one.mjs             # 单条源码的形状读数（shapeAst / declined / ShapeTexts / AST）
```

**回退**：

- 整轮：`git revert <本轮 commit>`（两个 `.xl.md` 的改动 + 一个探针文件 + 文档；无开关、无语料变化）。
- 单类：本轮四类的改动在文件里是**互相独立的段**（`StartTaggedTemplate` / `StartTypeAssert`+`ExpectTypeTail` /
  `TryTypeArgumentTail`+`ResetState`+`ReplayUntil` / `StartNewTarget`+私有名 + `StatementShapeAst` 的四个
  `BuildNode` 分支）。逐段删掉即可回到「该类回 legacy」，其它类不受影响。
- **注意**：`KindTypeAssert` 与 `KindTypeArguments` 都带「必须覆盖整段单元」的**安全拒绝**，
  删掉它们只会让条数回到原来的拒绝点，不会产生错树。

---

## 8. 风险与注意

1. **`Finish` 里多做了一件判事**（类型实参尾巴）。它只在 `SawLessThan && !Closed` 时跑，纯文本扫描
   （`AngleJudge.CanStart`），不改任何既有分支；`op-proof` 的 `bodies` / `inserts` 读数未变可作旁证。
2. **重放（`ResetState` + `ReplayUntil`）会重跑前缀的 `Ingest`**，因此 `TotalInserts` / `TotalIncomplete`
   需要按「最终状态」记账：重放成功后 `TotalIncomplete` 会减回去（否则「最终接住了」却被记成不完整）。
   如果将来给 `Ingest` 加副作用（计数 / 发布），必须同时检查这里。
3. **`KindTypeAssert` 与 `a as T + b`**：`as` 与关系运算符同级，形状层选择「类型之后必须到语句末尾」，
   所以 `a as T + b` 整条回 legacy（安全方向，不是错树）。想收它要给类型尾巴再接一层表达式解析。
4. **`ta-after-as` / `ta-after-instanceof` 是同一个机制缺口的两面**（§5 第 1 行）；下一轮如果做，
   建议直接在 `KindTypeArguments` 的 `ParsePostfixSuffix` 之后加「后缀结束但还有剩余单元 → 交给
   legacy `ParseBinary` 继续」——但要注意 `Pos` 口径必须与 `ParseBinary(start)` 的 `start` 一致。
5. **探针的 `known` 不是豁免**：`known` 行只断言「XML == legacy 且没有半棵树」，不要求接管。
   下一轮把 §5 某族做掉时，对应行必须从 `known` 挪成普通用例（删掉第 3 个元素）。
6. **`tmp/*.mjs` 是调查用，未入库**（`.gitignore` 里 `tmp`）；它们依赖 `build/ts`，复现前先 `xl_build` + `tsc`。
