# HANDOFF — Stage 3k：逗号运算符、`import.meta`、动态 `import()`

基线：`feature/possible-statement` @ **5650df5b**（主仓库已同步）。
分支：`feature/possible-statement-s3k`。工作目录：`C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s3k`。

## 1. 结论（先说清楚做了什么、没做什么）

本轮**没有**新增形状种类，也**没有**把逗号 / `import.meta` / 动态 `import()` 接进形状树。
动手前先按方法论取证，结论是：这三类**都不是「加一个分支」的量级**，其中逗号是**两层同改 + XML 节点名注册**
的架构改动。在预算内把树改一半会让 `--all` 与四步 AST 门从绿变红，那是伪造绿的反面但同样不可接受，
所以本轮交付的是**可执行的保守回退契约 + 精确到文件与方法的实现清单**，而不是一棵半成品树。

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 逗号运算符（`SequenceExpression`） | **未覆盖**，行为已由专用 gate 钉住 | 形状层**没有把 `,` 当运算符接**：它没有逗号分支，`IsSupportedBinary`（`:1351`）把逗号排除在二元集合之外，`Ingest` 落到「不支持的运算符」分支就 `Fail`，于是这类表达式语句**从不完整** → `Decline("表达式体不完整（运算符 ,）")` → legacy（实测 `shapeAst=0 / declined=1`）。legacy `ParseExpression` 把 `,` 建成 `BinaryExpressionShape`（`expression-builder.xl.md:283-306`），而 TS 是 `SequenceExpression`：**真实差异，未验证等价** |
| `import.meta` | **未覆盖**，形状层保守拒绝 | legacy 侧**已支持**：`expression-builder.xl.md:2496-2518` 建 `MetaPropertyShape`（children 只有 `meta`，`import` 不投影）；形状层由 `StatementOperatorBody.IsBareImport`（`:1371-1384`）在**路由**阶段整条交给 legacy（实测 `shapeAst=0 / declined=0`，连一次接管尝试都不发生），注释写明 `import.meta` 是 `MetaProperty`、`import("m")` 是 `ImportKeyword` + 调用，都不是「标识符 + 成员/调用」那棵树 |
| 动态 `import()` | **未覆盖**，形状层保守拒绝 | legacy 侧**已支持**：`expression-builder.xl.md:2502-2506` 把 `import` 建成 `ImportKeywordShape` 叶子，调用由 `ParsePostfix` 接着读；形状层同上被 `IsBareImport` 拒绝 |
| 参数 / 数组 / 对象内部的逗号 | **已覆盖且不误判** | 控制组 `f(a, b);`、`[a, b];`、`({a: 1, b: 2});` 仍由形状树接管（`shapeAst >= 1`），本轮用专用 gate 把这一点钉死 |
| `return a, b` | **未覆盖**（不归本层） | `return` 走 legacy 语句路径，本轮未触碰 |
| 类型实参歧义 / 解构 / 箭头 / 函数 / 类表达式 / `#private` | **未覆盖**（与 s3j 相同） | 仍 legacy，未改动 |

**改动面**：新增 1 个测试文件 `tests/statement-possible/comma-import-fallback.mjs` + 本文件。
**没有**修改任何 `.xl.md`、**没有**改 `core/`、**没有**改 `StatementBoundaryUtil.IsAsiBoundary`。
因此 `xl_build 887/0`、`tsc 0`、四步 AST 门与 `--all` 的读数**必须与基线逐位相同**（附录 B 是本次实测）。

## 2. 专用取证：`comma-import-fallback.mjs` 断言什么

11 条用例，分三组（`comma` / `import` / `control`），每条都跑**壳路径**（`EnableShellExpressions=true`）
与**同源码 legacy 路径**（`false`），断言四件事：

1. 两条路径都 Parse 成功、都产出 XML；
2. **壳 XML == legacy XML，逐字节**（回退是安全的，不是另一种树）；
3. 壳路径没有触发文件级 fallback；XML 里没有 `<StatementShape>` / `<StatementOperandShape>` /
   `<StatementOperatorBody>` / `<StatementShapeAst>` 泄漏；
4. 控制组 `shapeAst >= 1`（参数 / 数组 / 对象内部的逗号**不**被误当序列，也不整体退回 legacy）。

另外每条都打印台账：`TotalShapeAst`、`TotalDeclined`、`LastDeclineReason`、形状文本、以及
`ts.createSourceFile` 给出的**真实 TS 节点种类**。台账让「未覆盖」不是一句声明而是可复核的数字：
今天 `a, b;` 的 TS 是 `SequenceExpression`，而我们的树仍是 `BinaryExpression` —— 这个差异现在有 gate 看着，
谁把逗号接进来却没接 `SequenceExpression`，要么 `shapeAst` 从 0 变 1（台账立刻显形），
要么 XML 不再等于 legacy（第 2 条断言直接红）。

## 3. 为什么本轮不改树（不是「不想」，是「改一半更糟」）

逗号要真接，必须**同时**动三处，且第三处是最贵的：

1. **形状层**：`StatementOperatorBody.Ingest`（`:478`）要给 `,` 一条最低优先级的分隔路径
   （`PushOperator` 的优先级栈，逗号低于赋值），并让 `IsComplete` / `Covers` 认可它；
   `RenderInfix`（`:1247`）要给出逗号节点的文本形态。
2. **AST 层**：`StatementShapeAst.BuildNode` 现在对所有 `KindOperator` 一律建 `BinaryExpressionShape`
   （`:389-418`）。逗号分支不能沿用——`a, b, c` 在 TS 里是**一个** `SequenceExpression` 带三个 `expressions`，
   左结合的嵌套二元树是错的形状，必须沿左脊摊平。
3. **XML 节点名注册**：这是本轮取证发现的硬成本。全仓库 `SequenceExpression` **零命中**：
   AST 的 XML 名不是凭空来的，`BinaryExpression` / `MetaProperty` / `ImportKeyword` 都有对应的节点种类，
   而 `SequenceExpression` 一个都没有。也就是说即使前两处改对，输出仍没有合法的节点名。
   同时 legacy `ParseExpression` 也必须一起改成建序列节点，否则 op-ast-proof 的
   「壳 XML == legacy XML」会立刻红。

这三处是**一个原子改动**，任何一处单独落地都会让现有门变红。9 轮预算内无法在「不伪造绿」的前提下完成并验证，
所以本轮把力气花在**把差异变成可执行契约**和**把实现清单写到可直接开工**上。

## 4. 下一步实现清单（按此顺序，每步都可独立验证）

1. 先写**失败**的用例：向 `tests/statement-possible/op-ast-cases.json` 的 `ast-from-shapes` 组追加
   `a, b;`（期望 `shapeTexts: ["seq(a,b)"]`、`shapeAst: 1`、`counts: {"SequenceExpression": 1}`），
   确认它现在是红的——这是「先写期望、再让门变绿」的唯一合法顺序。
2. `SequenceExpressionShape` 新形状：`typescript/tokens/expressions/sequence-expression-shape.xl.md`
   （`extends ShapeToken`，children 是摊平后的各个表达式），并在 XML 节点名表里注册 `SequenceExpression`
   （位置待查：`BinaryExpression` 的名字不在 shape 类文件里，按同一路径找）。
3. legacy 侧：`ExpressionBuilder.ParseExpression` 的 `BinaryExpressionShape` 换成新形状 + 摊平
   （左结合：`a, b, c` 只建一个节点，`expressions = [a, b, c]`）。
4. 形状层：`StatementOperatorBody` 的 `Ingest` / `PushOperator` / `RenderInfix` 加逗号；
   `StatementShapeAst.BuildNode` 的 `KindOperator` 分支按运算符文本分流（`,` → 摊平建序列）。
5. 证据：`op-ast-cases` 加 `f(a, b), g(c);`、`(a, b) + c;`、`a = (1, 2);`（后者**应是**序列，
   括号内仍是逗号表达式；而 `f(a, b)` 的逗号是实参列表，不是序列）；op-proof 的 `operators-live`
   组同步加结构文本；`comma-import-fallback.mjs` 的 `comma` 组改为期望 `shapeAst: 1`。
6. `import.meta` / `import()` 另起一类：`MetaPropertyPossibleShape`（`:18/:24` 现在直接 `throw`）
   与 `ImportKeywordPossibleShape`（同样 `throw`）是现成的挂点；形状层要能表达「`import` 是关键字叶子、
   `.meta` 是 MetaProperty、`import(...)` 是 CallExpression 且 callee 是 ImportKeyword」，
   并与语句级 `ImportDeclaration` 分派互斥（保守：先只接 `import.meta` / `import(` 两种前瞻形态，其余 `Decline`）。
   完成前 `IsBareImport` 保持拒绝。

## 5. 未覆盖清单（相对本轮）

1. 逗号运算符 → `SequenceExpression`（形状层与 legacy 均未接，legacy 仍是 `BinaryExpression`）。
2. `import.meta` / `import.meta.url` → `MetaProperty`（形状层拒绝，legacy 已能建）。
3. 动态 `import("x")` → `CallExpression`（callee 是 `ImportKeyword`；形状层拒绝，legacy 已能建）。
4. `await import("x")`：`await` 形状未接，整条仍 legacy。
5. `return a, b`：`return` 走 legacy，未触碰。
6. 类型实参歧义、解构赋值、箭头 / 函数 / 类表达式、`#private`：与 s3j 相同，仍 legacy。

## 6. 风险

- **「绿」不等于「对」**：`comma-import-fallback.mjs` 是**回退契约** gate，不是接管 gate。
  它保证「回退安全、控制组不误判」，**不**证明逗号已正确。别把它的 PASS 读成「逗号做完了」。
- **台账式 gate 的脆弱点**：它依赖 `TotalShapeAst` / `TotalDeclined` / `ShapeTexts` 这三个进程内计数。
  如果将来形状层重构掉这几个静态字段，gate 会先崩而不是先红——这是刻意的（宁可响，不可静默）。
- **`SequenceExpression` 的 XML 名是未知项**：本轮只确认了「全仓库零命中」，没有找到节点名表的注册位置。
  下一轮第一步应当是**先找到那张表**（用 `BinaryExpression` 的 XML 名反查），否则第 2 步会卡住。
- **两层同改的耦合**：legacy 与形状层必须一起改，否则 op-ast-proof 的逐字节 XML 比对会红。
  这正是它作为门有价值的地方，也意味着逗号不能「小步灰度」。
- 本轮未改任何 `.xl.md`，故 perf 与四步 AST 门读数只作基线记录，不构成回归证据。

## 7. 复现命令（cwd = 本目录）

```powershell
xl_build targets=["ts"] paths=["core","typescript"]        # 887 written / 0 error
node node_modules/typescript/bin/tsc -p tsconfig.json      # exit 0
node tests/statement-possible/comma-import-fallback.mjs    # 11/11（回退契约）
node tests/statement-possible/op-ast-proof.mjs             # 62/62
node tests/statement-possible/op-proof.mjs                 # 40/40
node tests/statement-possible/harness.mjs --all            # 101 pass / 0 fail / known 1
node tests/statement-possible/harness.mjs --lint           # PASS
node tests/parse/validate.mjs                              # 1720/0
node typescript/cases/ast-json.mjs; git status --short typescript/cases; git checkout -- typescript/cases
node typescript/cases/ast-json-diff.mjs                    # 0/0/0
node typescript/cases/token-ast.mjs                        # 1716/1706/0/0/10
node typescript/cases/real-dts-ast.mjs                     # 226/226
```

## 附录 A — 专用取证实测（`comma-import-fallback.mjs`）

下面是**本次运行的原样输出**：11 条用例的 PASS/FAIL，以及未覆盖构造的保守回退台账
（`TotalShapeAst` / `TotalDeclined` / `LastDeclineReason` / TS 真实节点种类）。

```
$ node tests/statement-possible/comma-import-fallback.mjs   # exit 0
PASS  comma-plain          kind=comma    shapeAst=0 declined=1 ts=BinaryExpression texts=[]
PASS  comma-call           kind=comma    shapeAst=0 declined=1 ts=BinaryExpression texts=[]
PASS  comma-assign         kind=comma    shapeAst=0 declined=1 ts=BinaryExpression texts=[]
PASS  comma-mixed          kind=comma    shapeAst=0 declined=1 ts=BinaryExpression texts=[]
PASS  comma-add            kind=comma    shapeAst=0 declined=1 ts=BinaryExpression texts=[]
PASS  import-meta-url      kind=import   shapeAst=0 declined=0 ts=PropertyAccessExpression texts=[]
PASS  import-meta          kind=import   shapeAst=0 declined=0 ts=MetaProperty texts=[]
PASS  import-dynamic       kind=import   shapeAst=0 declined=0 ts=CallExpression texts=[]
PASS  control-call-args    kind=control  shapeAst=1 declined=0 ts=CallExpression texts=["call(f)"]
PASS  control-array        kind=control  shapeAst=1 declined=0 ts=ArrayLiteralExpression texts=["array"]
PASS  control-object       kind=control  shapeAst=1 declined=0 ts=ParenthesizedExpression texts=["(object)"]

[ledger] 未覆盖构造的保守回退台账（形状层没有接管，AST 由 legacy 产出）：
  comma-plain  source="a, b;"  shapeAst=0 declined=1
      declineReason="表达式体不完整（运算符 ,）"  tsExpression=BinaryExpression
      shapeNodes=["BinaryExpressionShape"]  shapeTexts=[]
  comma-call  source="f(), g();"  shapeAst=0 declined=1
      declineReason="表达式体不完整（运算符 ,）"  tsExpression=BinaryExpression
      shapeNodes=["BinaryExpressionShape","CallExpressionShape"]  shapeTexts=[]
  comma-assign  source="a = (1, 2);"  shapeAst=0 declined=1
      declineReason="表达式体不完整（单元）"  tsExpression=BinaryExpression
      shapeNodes=["BinaryExpressionShape","ParenthesizedExpressionShape"]  shapeTexts=[]
  comma-mixed  source="f(a, b), g(c);"  shapeAst=0 declined=1
      declineReason="表达式体不完整（运算符 ,）"  tsExpression=BinaryExpression
      shapeNodes=["BinaryExpressionShape","CallExpressionShape"]  shapeTexts=[]
  comma-add  source="(a, b) + c;"  shapeAst=0 declined=1
      declineReason="表达式体没有唯一的根节点"  tsExpression=BinaryExpression
      shapeNodes=["BinaryExpressionShape","ParenthesizedExpressionShape"]  shapeTexts=[]
  import-meta-url  source="import.meta.url;"  shapeAst=0 declined=0
      declineReason=""  tsExpression=PropertyAccessExpression
      shapeNodes=["MetaPropertyShape"]  shapeTexts=[]
  import-meta  source="import.meta;"  shapeAst=0 declined=0
      declineReason=""  tsExpression=MetaProperty
      shapeNodes=["MetaPropertyShape"]  shapeTexts=[]
  import-dynamic  source="import(\"x\");"  shapeAst=0 declined=0
      declineReason=""  tsExpression=CallExpression
      shapeNodes=["CallExpressionShape","ImportKeywordShape"]  shapeTexts=[]

[comma-import-fallback] cases=11 pass=11 fail=0（契约：XML==legacy、无 fallback、无形状泄漏、控制组仍被接管）

```

## 附录 B — 全表读数（本次运行，每道门尾部原样摘录）

本轮未改任何 `.xl.md` / `core/` / `IsAsiBoundary`，所以读数应与基线逐位相同；不同即环境或分支不干净。

### tsc  (exit 0, 4199ms)
```
```

### op-ast-proof  (exit 0, 556ms)
```
PASS  s3g-object-add  shapeAst=1 declined=0 texts=["+(member((object),a),1)"]
PASS  s3g-new-bare  shapeAst=1 declined=0 texts=["new(X)"]
PASS  s3g-new-args  shapeAst=1 declined=0 texts=["new(X)"]
PASS  s3g-new-member  shapeAst=1 declined=0 texts=["member(new(X),y)"]
PASS  s3g-new-callee-chain  shapeAst=1 declined=0 texts=["new(member(a,b))"]
PASS  s3g-optional-member  shapeAst=1 declined=0 texts=["member(a,b)"]
PASS  s3g-optional-chain  shapeAst=1 declined=0 texts=["member(member(a,b),c)"]
PASS  s3g-optional-call  shapeAst=1 declined=0 texts=["call(f)"]
PASS  s3g-optional-index  shapeAst=1 declined=0 texts=["index(a,b)"]
PASS  s3g-optional-add  shapeAst=1 declined=0 texts=["+(member(a,b),1)"]
PASS  s3g-declined-assign  shapeAst=1 declined=0 texts=["=(a,b)"]
[op-ast-proof] group=ast-from-shapes cases=62 pass=62 fail=0 | 形状树接管计数已核 62 条、TS 逐节点已核 62 条、AST 数字叶子已核 8 条
```

### op-proof  (exit 0, 374ms)
```
PASS  op-leaf-true  texts=["&&(true,false)"] inserts=1 bodies=1
PASS  op-leaf-null  texts=["??(null,a)"] inserts=1 bodies=1
PASS  op-leaf-this  texts=["this"] inserts=0 bodies=1
PASS  op-leaf-bigint  texts=["+(1n,2n)"] inserts=1 bodies=1
PASS  op-paren-logical  texts=["||((a&&b),c)"] inserts=2 bodies=1
PASS  op-unsupported-postfix  texts=["post(a)"] inserts=1 bodies=1
PASS  op-unsupported-string  texts=["+(string,a)"] inserts=1 bodies=1
PASS  s3g-op-object-member  texts=["+(member((object),a),1)"] inserts=2 bodies=1
PASS  s3g-op-template-interp  texts=["+(template,z)"] inserts=1 bodies=1
PASS  s3g-op-new-chain  texts=["member(new(X),y)"] inserts=1 bodies=1
PASS  s3g-op-optional-chain  texts=["member(member(a,b),c)"] inserts=2 bodies=1
[op-proof] group=operators-live cases=40 pass=40 fail=0 | 结构文本已核 40 条、InsertBetween 计数已核 38 条
```

### harness --all  (exit 0, 786ms)
```
[group] trivia: pass=8 fail=0 skip=0 uncovered=0
[group] route: pass=14 fail=0 skip=0 uncovered=0
KNOWN satisfies/satisfies-decl-instantiation-no-semicolon  "let a: Foo<Bar>\nlet b = 1;"
      AST 差异（已知基线缺陷）：#0 kind: TS=VariableStatement CJ=Common
[group] satisfies: pass=8 fail=0 skip=0 uncovered=0
[group] operators: pass=18 fail=0 skip=0 uncovered=0
SKIP  group stage4 —— 根目录未注册 IfStatementPossibleShape（Stage 4 未实现）
SKIP  group stage5 —— 语句壳 CatalogGuide 的体候选为空（Stage 5 未实现）
[statement-possible] 互斥仪器: cells=667 candidateCalls=4105 endCalls=664 acceptCells=152 waitingNoCandidate=225
[statement-possible] double-accept 冲突: 0
[statement-possible] groups run=8 skipped=3 | cases pass=101 fail=0 skip=0 known=1 uncovered=0
[statement-possible] file-fallback total=0 distinct=0
```

### harness --double-accept  (exit 0, 627ms)
```
[statement-possible] 互斥仪器: cells=762 candidateCalls=4736 endCalls=759 acceptCells=170 waitingNoCandidate=263
[statement-possible] double-accept 冲突: 0
[statement-possible] double-accept: cases=120 failed=0
```

### harness --lint  (exit 0, 436ms)
```
[lint] ASI 判据定义点
  impl      typescript/tokens/declarations/type-alias-declaration-possible-shape.js:231 (units, last, at) body=1571B
  impl      typescript/tokens/statements/statement-boundary-util.js:16 (units, tokenIndex, limit) body=8116B
  delegate  typescript/tokens/statements/expression-statement-possible-shape.js:286 (units, tokenIndex, limit)
[lint] 优先级来源
  Precedence 定义 typescript/tokens/expressions/operator-table.js
[lint] OperatorTable 数字优先级条目=12
[lint] 结果：PASS（ASI 实现唯一 / 优先级数字表只在 operator-table）
```

### validate  (exit 0, 575ms)
```
1720 条用例，0 条不合格
```

### feas harness  (exit 0, 308ms)
```
[feas-operator] cases=6 pass=6 fail=0
```

### insert-between  (exit 0, 153ms)
```
PASS  Data 顺序：wrapper 原位顶替 child
PASS  Parent 指针：child 被搬进 wrapper
PASS  MountedUnit 转交（父挂 child）
PASS  MountedUnit：父没挂 child 时保持 null
PASS  SourceRange：sealRange 继承 child 范围，child 不重签
PASS  SourceRange：未 seal 只继承起点
PASS  Pos / LastIndex 继承
PASS  嵌套插入：wrapper 套 wrapper
PASS  拒绝非法输入
[feas-operator] insert-between tests=9 pass=9 fail=0
```

### perf  (exit 0, 567ms)
```
[perf] build=C:\Users\Admin\Documents\GitHub\xl-example-set\feature\possible-statement-s3k\build\ts
[perf] reps=5 long=300 many=2000（中位数；不设硬阈值）
[perf] long n=300 median=5.31ms tokens=599 candidateCalls=34 callsPerToken=0.06
[perf] many statements=2000 median=33.16ms tokens=2000 candidateCalls=34017 callsPerToken=17.01
[perf] scale n=100 median=0.73ms tokens=199 candidateCalls=34
[perf] scale n=200 median=1.47ms tokens=399 candidateCalls=34
[perf] scale n=400 median=3.41ms tokens=799 candidateCalls=34
[perf] scale ratio(200/100)=2.01 ratio(400/200)=2.32（线性≈2.0；>2.5 视为退化告警，不判失败）
[perf] done
```

### ast-json  (exit 0, 1771ms)
```
[module-declarations] cases=26 cj-ok=26 cj-fail=0
[number] cases=63 cj-ok=63 cj-fail=0
[possible-build] cases=198 cj-ok=198 cj-fail=0
[possible-compute] cases=205 cj-ok=205 cj-fail=0
[regex] cases=273 cj-ok=273 cj-fail=0
[spread-forms] cases=30 cj-ok=30 cj-fail=0
[statements] cases=412 cj-ok=412 cj-fail=0
[string] cases=75 cj-ok=75 cj-fail=0
[type-assertions] cases=28 cj-ok=28 cj-fail=0
[types] cases=450 cj-ok=450 cj-fail=0
[using-declarations] cases=29 cj-ok=29 cj-fail=0
total cases=6167 cj-ok=6167 cj-fail=0（47 个构造）
```

### ast-json 后 git status --short typescript/cases
```
(空 —— 与基线等价)
```

### ast-json-diff  (exit 0, 348ms)
```
用例 28：完全一致 28 / 28
有结构差 0 条、有位置差 0 条、有字段差 0 条
（没有 gap）
=== types ===
用例 450：完全一致 450 / 450
有结构差 0 条、有位置差 0 条、有字段差 0 条
（没有 gap）
=== using-declarations ===
用例 29：完全一致 29 / 29
有结构差 0 条、有位置差 0 条、有字段差 0 条
（没有 gap）
合计 6167 条：完全一致 6167 / 6167；有结构差 0 条、有位置差 0 条、有字段差 0 条
```

### token-ast  (exit 0, 1938ms)
```
OK         tests/cases/token/types/type-union-member-generic.ts
OK         tests/cases/token/types/type-union-of-arrays.ts
OK         tests/cases/token/types/type-union-paren-object.ts
OK         tests/cases/token/types/type-union-precedence.ts
OK         tests/cases/token/types/type-union-qualified-member.ts
OK         tests/cases/token/types/type-union-two.ts
OK         tests/cases/token/types/type-union-undefined.ts
OK         tests/cases/token/types/type-unique-symbol.ts
OK         tests/cases/token/types/typeof-import-newline.ts
summary: total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 gap-now-passing=0
known-gap:     0 file(s) (none)
non-known-gap: 1716 file(s) (ok 1706, ts-invalid 10)
```

### real-dts  (exit 0, 3414ms)
```
real-dts: 文件 226（跳过 TS 非法 0）：解析成功 226、崩溃 0；AST 完全一致 226、有差异 0
真实 .d.ts 全量解析成功且 AST 逐节点一致
```

