# HANDOFF — Stage 3 S3c：表达式语句的 AST 由增量形状树产出

分支 `feature/possible-statement-s3c`（基线 `origin/feature/possible-statement` @ `9cac6ee6`）。
本轮把「受支持表达式语句的 AST」从 `StatementBuilder` 整段读 raw 单元，改成**由 S3a/S3b 的增量形状树逐节点组装**；
未覆盖构造与其余语句族原样走既有 legacy 路径（文件级 fallback 计数仍为 0）。

---

## 1. 设计与实现

### 1.1 叶子持 raw 单元（`statement-operator-body.xl.md`）

`StatementOperandShape` 新增 `field Raw:Token | null = null`：

- 标识符 / 数字叶子 → 那个 raw `Common`；
- 二元 / 前缀节点 → 那个运算符 `Symbol`；
- 括号节点 → 那个 `Bracket`（`(`…`)` 在 token 层是一个单元，内部 `Data` 才是括号里的单元）。

**只是引用，不是搬运**：单元仍留在壳 `Data` 里，`Parent` 指针不动，也不进 XML（`op-proof` / `op-ast-proof`
都断言 XML 里不出现 `<StatementShape>` / `<StatementOperandShape>` / `<StatementOperatorBody>`）。
持 `Raw` 的唯一目的是把形状树对到 `ExpressionBuilder.Units` 的同一格上，从而让
`Pos` / `SignIn` / `SignOut` 落在**与 legacy 同一个单元**。

### 1.2 收口器（新文件 `typescript/tokens/statements/statement-shape-ast.xl.md`）

`class StatementShapeAst`：

| 成员 | 作用 |
| --- | --- |
| `Build(body, units, basePos, template, context)` | 表达式体 → AST 表达式节点；返回 `null` = 本条不归形状树 |
| `BuildNode(node, builder, context, covered)` | 一个形状节点 → 一个 AST 节点（递归） |
| `Covers(covered, expected)` | 覆盖判据：`covered` 必须恰好是 `0..expected-1` 的递增序列 |
| `TotalShapeAst` / `TotalDeclined` / `LastDeclineReason` | 静态取证计数与精确原因 |

**节点工厂一个都不重写**（这是「与 legacy 逐字段一致」的结构性来源）：

| 形状节点 | AST 节点 | 工厂 / 口径 |
| --- | --- | --- |
| `KindIdentifier` | `IdentifierShape` | `IdentifierShape.FromBasicToken(raw, ctx)` + `Pos = Positions[idx]`（= `ParsePrimary` 的 Common 分支） |
| `KindNumber` | `NumericLiteralShape` | 同上（大整数 `IsBigInt()` 直接 decline，S3c 不接管） |
| `KindOperator` | `BinaryExpressionShape` | `Add(left)`、`Add(builder.MakeOperatorToken(raw, opIdx))`、`Add(right)`，`SpanNode(最左, 最右)`（= `ParseBinary`） |
| `KindParen` | `ParenthesizedExpressionShape` | 内部**新建** `ExpressionBuilder` 载入 `bracket.Data`、`base = StartIndex + 1`，`Add(inner)`，`SpanNode(idx, idx)`（= `ParsePrimary` + `ParseBracketExpression`） |
| `KindPrefix` | — | **不接管**（未覆盖清单），`Decline` 回 legacy |

两个 `ExpressionBuilder` 语义细节被逐字继承，否则会出现位置/结构差：括号内部是**新的** builder（单元集是
`bracket.Data`，不是壳的 `Units`）；`Pos` 一律取 `Positions[index]`（含前导 trivia 的起点）。

### 1.3 收口路径（`statement-builder.xl.md` + `statement-shape.xl.md`）

新增 `StatementBuilder.BuildExpressionStatementFromShapes(body):Token | null`：

1. 判界与 legacy `BuildExpressionStatement` **逐字相同**（`;`、`StatementBuilder.EndsAtLineBreak`、
   `ExpressionStatementPossibleShape.IsAsiBoundary(units, at, first)`、`yield` 受限产生式）——判界只允许一份，
   否则同一条源码会有两条边界；
2. `units = Units[first..expressionLast]`，`basePos = Positions[first]`；
3. `StatementShapeAst.Build(...)` 拿到表达式节点；`null` → **原样返回 null**（`At` 不动、不建形状、不改状态）；
4. 成功 → `ExpressionStatementShape` + `Add(expression)` + `At = statementLast + 1` + `Finish(shape, first, statementLast)`
   （与 legacy 的收尾顺序一模一样）。

`StatementShape.BuildFromShell` 的切换：

```ts
if (shell.Kind === StatementRoute.ShellPlainExpression && shell.OperatorBody !== null) {
  try { built = builder.BuildExpressionStatementFromShapes(shell.OperatorBody); } catch { built = null; }
}
if (built === null) { built = builder.BuildStatement(); }
```

收口前补一次 `shell.OperatorBody.IngestAll(shell.Data, host.Template)`：壳的 `ComputePossibleShapes` 只在
「有新单元流进来」时被调用，所以本条目最后一格之后没有格子再喂状态机（`a;`、文件末尾的 `a+b`），
体就会停在 `Ingested == 0` 而 `IsComplete()` 永远假。`IngestAll` 只从 `Ingested` 往后追加、遇
`Closed` / `Incomplete` 即停，对已经喂完的体是空操作。

### 1.4 切换条件（没有为绿放宽）

新路径只在**四条同时成立**时接管：

1. `shell.Kind == StatementRoute.ShellPlainExpression`（表达式语句族）；
2. `OperatorBody !== null` 且 `IsComplete()`（`!Incomplete && Expect == ExpectOperator && 无帧在等右操作数`）；
3. `BuildNode` 一路认得每个节点（标识符 / 数字 / `+ - * / %` / 圆括号；前缀、成员、调用、字符串/模板/正则、
   大整数一律 `Decline`）；
4. `Covers(covered, Units.length)`：形状树覆盖的单元下标**恰好**是 `0..n-1`（递增、无空洞、无多余）。

任一条不成立 → `built === null` → legacy `BuildStatement()`，`At` 未被消费，行为逐位不变。
`TotalShapeAst` 只在真正建成时 +1，因此「回退」无法伪装成接管：`op-ast-cases.json` 对未覆盖构造期望
`shapeAst: 0` + `declined: 1`，对覆盖构造期望 `shapeAst: 1（或每条语句 +1）`。

---

## 2. 专用证据（`tests/statement-possible/op-ast-*`）

`op-ast-cases.json`（`ast-from-shapes` 组，16 条）+ `op-ast-proof.mjs`，每条断言四件事：

1. 壳路径 XML == 同源码 legacy（`EnableShellExpressions=false`）XML，**逐字节**；
2. 形状树**确实接管 AST**：`StatementShapeAst.TotalShapeAst === shapeAst`（未覆盖构造必须 0 且 `declined > 0`）；
3. 形状结构 == **TypeScript 自己的 AST 结构**：`ts.createSourceFile` 逐节点渲染成与 `ShapeTexts` 同一套前缀写法后
   逐字比较（二元左右子树、括号、前缀、叶子文本各是独立节点；TS 渲染不了的调用/成员访问返回 `null` 并被滤掉，
   用例用 `tsTexts` 显式声明期望）；
4. 壳里不泄漏形状节点进 XML。

实测（`node tests/statement-possible/op-ast-proof.mjs`）：

```
[op-ast-proof] group=ast-from-shapes cases=16 pass=16 fail=0 | 形状树接管计数已核 16 条、TS 逐节点已核 16 条
```

覆盖与读数：

| case | source | texts | shapeAst |
| --- | --- | --- | --- |
| ast-mul-add | `1*2+3;` | `+(*(1,2),3)` | 1 |
| ast-add-mul | `a+b*c;` | `+(a,*(b,c))` | 1 |
| ast-sub-left | `a-b-c;` | `-(-(a,b),c)` | 1 |
| ast-paren-right | `a*(b+c);` | `*(a,(b+c))` | 1 |
| ast-paren-left | `(a+b)*c;` | `*((a+b),c)` | 1 |
| ast-mixed | `a+b*c-d/e;` | `-(+(a,*(b,c)),/(d,e))` | 1 |
| ast-div-mul | `1/2*3;` | `*(/(1,2),3)` | 1 |
| ast-ident-only | `a;` | `a` | 1 |
| ast-no-semicolon | `a+b`（EOF） | `+(a,b)` | 1 |
| ast-two-on-one-line | `1*2+3;a+b*c;` | 两条 | 2 |
| ast-multi-statement | `1*2+3;` ⏎ `a+b*c;` ⏎ `let z = a+b*c;` | 两条（变量声明不建体） | 2 |
| ast-asi | `a+b` ⏎ `c*d;` | `+(a,b)` / `*(c,d)` | 2 |
| ast-fallback-call | `f(1, 2);` | — | 0（declined 1） |
| ast-fallback-element | `a[0];` | — | 0（declined 1） |
| ast-fallback-prefix | `-a+b;` | `+(-(a),b)`（体完整） | 0（declined 1） |
| ast-fallback-member | `a.b;` | — | 0（declined 1） |

`ast-fallback-prefix` 是关键的反「假绿」用例：形状体**完整**（结构文本照旧发布），但 S3c 的前缀节点还没接
AST，所以接管计数必须是 0——如果哪天把前缀也接上，这条会红，必须连带更新未覆盖清单。

---

## 3. 全表读数（本分支实测）

| 门 | 读数 |
| --- | --- |
| xl_build（targets ts，paths core/typescript） | **886 files written，0 error**（基线 885，新增 1 个 .xl.md） |
| tsc -p tsconfig.json | **0 error** |
| validate | **1720 条，0 条不合格** |
| ast-json | **6167/6167**（47 个构造） |
| ast-json-diff | **完全一致 6167/6167；结构差 0、位置差 0、字段差 0** |
| token-ast | **1716 / ok 1706 / crash 0 / diff 0 / ts-invalid 10** |
| real-dts | **226/226，AST 617 全一致，崩溃 0** |
| harness --all | **72 pass / 0 fail / 1 known** |
| harness operators-live（op-cases） | **12/12**，file-fallback 0 |
| harness dev（dev-cases） | **全绿**（含在 --all 内单独跑亦为全绿） |
| harness --double-accept | **91 cases，冲突 0** |
| harness --lint | **PASS**（ASI 实现唯一 / 优先级数字只在 operator-table） |
| op-proof（S3a/S3b 结构证明） | **12/12**，结构文本 12 条、InsertBetween 11 条 |
| feas-operator harness | **6/6**；insert-between **9/9** |
| perf | n=400 median 14.14ms、ratio 3.12 / 3.35（WARN：>2.5 疑似二次退化，判据与基线同形，不判失败） |

`typescript/cases/*.cj-ast.json` 在跑完后已 `git checkout -- typescript/cases`，未提交任何产物。

与基线对比：基线全表（xl_build 885/0、tsc 0、validate 1720/0、ast-json 6167/6167、diff 0/0/0、
token-ast 1716/1706/0/0/10、real-dts 226/226、dev 22/22、operators-live 12/12、op-proof 12/12、
--all 72/0/known1、double-accept 0、lint PASS）**全部保持**，无一项变红。

---

## 4. 未覆盖清单（走 legacy，均有计数与原因）

`StatementShapeAst.Decline` 的 `LastDeclineReason` 是逐条的精确原因。当前未接管：

1. **前缀一元** `+ - ! ~ typeof void delete`（`KindPrefix`）：形状体已能建（`+(-(a),b)`），AST 未接；
2. **其余二元运算符**：`** && || ?? | & ^ == === < <= > >= << >> >>>`、`in` / `instanceof`、
   `as` / `satisfies`（S3b 的 `IsSupportedBinary` 只放行 `+ - * / %`，其余在摄入期就 `Incomplete`）；
3. **赋值与逗号**：`= += …`、`a = b, c = d`；
4. **成员 / 调用 / 索引 / 模板**：`a.b`、`f(x)`、`a[0]`、`` tag`…` ``（摄入期 `Incomplete`）；
5. **字面量族**：字符串、模板、正则、大整数（`1n` 用 `NumericLiteralShape` 会错，故 `IsBigInt` 直接 decline）、
   布尔 / `null` / `this` / `new` / 函数与类表达式；
6. **三元 / 箭头 / 自增自减 / 类型断言与泛型调用**；
7. **变量声明语句族**（`ShellVariable`，`OperatorBody === null`）、以及所有非表达式语句族——按设计不走本路径；
8. `for` / `if` / 块内的表达式语句：块内走 `StatementBuilder.BuildExpressionStatement`，本轮未接形状树
   （块内没有 `StatementShape` 壳，也没有 `OperatorBody`）。

这些一条都不影响 XML：`op-proof` 的 `op-unsupported-call` 与 `op-ast-proof` 的 4 条 fallback 用例证明
「拒绝接管 = legacy 建 AST = XML 与 legacy 逐字节一致」。

---

## 5. 剩余风险

1. **`try/catch` 兜底**：`BuildFromShell` 对新路径包了 `catch`（异常 → legacy）。它不会伪造绿
   （`TotalShapeAst` 不增、`op-ast-proof` 的期望计数会红），但确实会**隐藏异常细节**；诊断入口是
   `StatementShapeAst.LastDeclineReason`，异常路径不写原因。若后续要查，可把 catch 里加一条静态计数。
2. **补喂单元的边界语义**：收口前 `IngestAll` 会把壳里剩下的单元（含 ASI 边界 token）也喂一遍。体遇
   `Closed`/`Incomplete` 即停，且 `Covers` 会拒绝「盖到表达式末尾之外」的树，所以只可能少接管、不可能错接管；
   但 `ShapeTexts` 的**发布时机**比 S3b 略晚（收口时而不是格子到齐时），`op-proof` 的结构文本期望未受影响
   （12/12），如后续要依赖「发布时机」需要复核。
3. **括号单元的身份**：括号节点用 `builder.Units.indexOf(bracket)` 定位，依赖「同一个 token 对象」这一事实；
   若将来有人在壳里重建 basic token（而不是搬运），这条对齐会静默失配 → `Covers` 会 decline（安全，但会掉接管率）。
4. **perf WARN 与基线同形**（ratio 3.35 > 2.5），本轮未引入新的复杂度（`indexOf` 只在闭包期、每节点一次，
   规模 = 一条语句的单元数），但未做 n 更大的实测。
5. **多语句 + 变量声明混排**只测了 3 条语句的形态；更长的混排、以及块内表达式语句没进本组用例。

---

## 6. 复现命令

```powershell
# xl_build / xl_check：targets=["ts"], paths=["core","typescript"] → 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json
node tests/statement-possible/op-ast-proof.mjs          # S3c 专用证据 16/16
node tests/statement-possible/op-proof.mjs              # S3a/S3b 结构证明 12/12
node tests/statement-possible/harness.mjs --file=tests/statement-possible/op-cases.json --group=operators-live
node tests/statement-possible/harness.mjs --file=tests/statement-possible/dev-cases.json --group=dev
node tests/statement-possible/harness.mjs --all
node tests/statement-possible/harness.mjs --double-accept
node tests/statement-possible/harness.mjs --lint
node tests/parse/validate.mjs
node typescript/cases/ast-json.mjs ; node typescript/cases/ast-json-diff.mjs
node typescript/cases/token-ast.mjs ; node typescript/cases/real-dts-ast.mjs
node tests/feas-operator/harness.mjs ; node tests/feas-operator/insert-between.test.mjs
node tests/statement-possible/perf.mjs
git checkout -- typescript/cases   # 产物绝不提交
```
