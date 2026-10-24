# HANDOFF — Stage 3g：对象字面量 + 带内插模板 + `new` + 可选链

分支 `feature/possible-statement-s3g`，基线 `feature/possible-statement` @ 76d6902f。

本片只动形状层（`statement-operator-body.xl.md`）、AST 收口（`statement-shape-ast.xl.md`）与专用 cases；
`core/`、`StatementBoundaryUtil.IsAsiBoundary`、legacy 建造器一行未改。

## 1. 新增支持（四类，逐类形状层 + AST 层）

### 1.1 带内插模板 `` `a${b}c` ``

- 形状层：`KindTemplate` 不再拒绝内插（删掉了 `HasInterpolation` 分支），无内插与有内插**同一个 Kind**。
- AST 层：`KindTemplate` 统一 `builder.At = index; ParseTemplateToken(); 复位 At`。
  `ParseTemplateToken` 在 `interps.length === 0` 时返回 `NoSubstitutionTemplateLiteralShape`，
  否则返回 `TemplateExpressionShape`（`TemplateHead` + 每个 `TemplateSpan`），`Pos` / 区间全由这段 legacy 代码决定。
  所以无内插那条路径与 S3f 的旧实现**逐字段同源**（不是新写一遍）。
- 覆盖形态：单内插、多内插、模板作为二元操作数、内插里的表达式（由 `ParseTemplateToken` 内部子 builder 解析）。

### 1.2 对象字面量（只在明确表达式位置）

- 形状层 `KindObject`，`Raw` = `{` 括号单元；**只在 `Nested` 本体里接受**（即括号 / 索引内部），
  非嵌套操作数位置（包括语句首 `{`）一律 `return null` → `Fail` → legacy。
  这样语句首 `{` 仍然走块壳（`BlockPossibleShape`）与 legacy，Stage 4 块壳不会被本片抢语义。
- AST 层：`ParseObjectLiteral(bracket, index)`，与 `ParseArrayLiteral` 的用法完全同形（成员 / 简写 / 展开 /
  访问器 / 计算属性名全由 legacy 建，形状层只证明「这是一个对象字面量操作数」）。
- 覆盖形态：`({a:1})`、`({a:1, b:2}.a)`、`({a:1}).a + 1`。

### 1.3 `new X()` / `new X(a)`

- 形状层 `KindNew` 是**前缀节点**，走既有的 `Prefixes` 栈，所以 `-new X()` 的包裹顺序自然正确。
  读 `new` → 压栈；操作数到达 → `AttachOperand` 把它挂进 KindNew 并置 `Open = true`。
- `Open` 区分两种后缀：`Open == true` 时 `InsertionPoint` **穿过** KindNew（`.b` / `[k]` 属于被构造者的链，
  `new a.b()`）；`AcceptNewArgs` 把第一个 `(` 记进 `Args` 并置 `Open = false`，其后的 `.y` / `()` 属于构造结果
  （`new X().y` = `member(new(X), y)`）。
- AST 层：`builder.At = newIndex; ParseNew(); 复位 At`，把 `newIndex .. At-1` 整段记进 covered。
  `NewExpressionShape` 的 children（被构造者链 + 实参）与 `Pos` 由 legacy 的 `ParseNew` 决定，不重写。
- 覆盖形态：`new X()`、`new X(a)`、`new X().y`、`new a.b(c)`。

### 1.4 可选链 `a?.b` / `a?.[b]` / `f?.()`

- 形状层：`?.` 先建一个 `KindQuestionDot` 待定节点（`InsertBetween` 插到对象位置，`Data = [对象]`），
  转 `ExpectOptional`；下一个单元到达后**原地升级**为 `KindOptionalMember` / `KindOptionalCall` / `KindOptionalIndex`。
  这解决「`?.` 之后是名字 / `(` / `[` 要等下一格才知道」的增量问题，不需要向前看。
- AST 层：三种都复用 `PropertyAccessExpressionShape` / `CallExpressionShape` / `ElementAccessExpressionShape`，
  差别只是 `?.` 作为子节点插在中间：`access.Add(builder.MakeOperatorToken(dotRaw, dotIndex))`，
  与 `ExpressionBuilder.ParsePostfixSuffix` 的 `?.` 分支逐行同口径（`QuestionDotTokenShape` 由同一个工厂建）。
- 覆盖形态：`a?.b`、`a?.b?.c`、`f?.()`、`a?.[b]`、`a?.b + 1`。

## 2. 未覆盖清单（安全回退，逐条 `Fail` → legacy，不建错树）

- 赋值 `=` / 复合赋值、逗号、条件 `?:`、`as` / `satisfies`、`++` / `--`（前缀与后缀）、箭头函数；
- `import.meta`、动态 `import()`（`IsBareImport` 保守拒绝）、类型实参调用 `f<T>(x)`（`HasTypeArgumentCall` 保守拒绝）；
- **对象字面量只在括号 / 索引内部**：`a + {b:1}` 这种裸操作数位置与语句首 `{` 都回 legacy
  （语句首 `{` 必须留给块壳，这是设计约束，不是缺口）；
- `class` 表达式：S3g 起显式 `Fail("class 表达式")`。原因：`class<T>{...}` 里 `<` / `>` 是二元运算符、
  `{...}` 又刚被本片接管，三格拼起来会「恰好完整」而建出 `class < T > {object}` 的错树
  （ast-json 的 class-expressions 3 条曾因此变红，本片已用这条守卫修回 0/0/0）；
- `new` 的复杂形态：`new X<T>()`（类型实参）、`new X`t``（标签模板）、`new.target` —— 形状层能接的只有
  「被构造者 + `.` / `[]` + 一层实参括号」；其余 `ParseNew` 消费的单元数与形状树覆盖不一致，
  由 `Covers` 判据挡下并 `Decline`（安全方向：少接管，不错树）；
- 可选链 + 类型实参（`a?.<T>(b)`）、可选链的 `!` 非空断言链：未接；
- `?.` 出现在成员名位置（`a?.` 后跟关键字 / 数字）→ `Fail`。

**未覆盖构造的判据没变**：形状层 `Fail`（撤槽位、停摄入）→ `StatementShapeAst.Build` 返回 `null` → legacy 建树，
XML 与 legacy 逐字节一致；专用 cases 里 `s3g-declined-assign`（`a = b;`）就是这条路径的取证
（`shapeAst = 0` 且 `declined > 0`）。

## 3. 专用 cases（`tests/statement-possible/op-ast-cases.json`，group `ast-from-shapes`）

新增 15 条：11 条接管 + 4 条组合，另有 1 条 declined。每条断言：
①壳路径 XML == legacy XML 逐字节；②`StatementShapeAst.TotalShapeAst` 达到期望条数（不接受静默回退）；
③形状结构文本 == `ts.createSourceFile` 逐节点渲染；④`counts` 直接数 AST 里的 `QuestionDotTokenShape` /
`NewExpressionShape` / `ObjectLiteralExpressionShape` / `TemplateExpressionShape` / `TemplateSpanShape` ——
光看 `member(a,b)` 这种文本分不出「带 `?.` 的成员访问」与普通成员访问，计数才钉得住。

```
s3g-template-interp        +  template-interp-multi
s3g-object-paren           +  object-member + object-add
s3g-new-bare               +  new-args + new-member + new-callee-chain
s3g-optional-member        +  optional-chain + optional-call + optional-index + optional-add
s3g-declined-assign（shapeAst=0, declined>0）
```

`tests/statement-possible/op-cases.json`（group `operators-live`）另加 4 条同形用例，走壳路径 XML 对拍。

## 4. 全表读数（本分支实测）

| 门 | 读数 |
| --- | --- |
| xl_build（core+typescript, ts） | 886 written / 0 error |
| tsc -p tsconfig.json | 0 error |
| op-ast-proof（ast-from-shapes） | **62/62**（新增 15 条全 PASS） |
| op-proof（operators-live） | **40/40**（新增 4 条全 PASS） |
| harness --group=operators-live | 40 pass / 0 fail |
| harness --group=dev | 22/22（exit 0） |
| harness --all | 72 pass / 0 fail / known 1 / skip 0 |
| harness --double-accept | cases=91 failed=0，冲突 0 |
| harness --lint | PASS |
| validate | 1720 条 / 0 不合格 |
| ast-json | 6167/6167 cj-ok；**status 空**；ast-json-diff 0/0/0 |
| token-ast | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 |
| real-dts | 226/226 |
| feas-operator harness | 6/6 |
| insert-between | 9/9 |
| perf | long n=300 median 9.69ms（599 tokens）；many 2000 语句 32.89ms；scale ratio 2.30 / 2.05（线性） |

## 5. 风险

1. **`class` 守卫是「靠关键字拦」而不是「靠语法判」**：`class` 出现在操作数位置一律 `Fail`，
   所以 `(class {})` 这类也会回 legacy（本来也要回）。若后续片要接管 class 表达式，这条守卫要连同 `<`/`>`
   的类型实参歧义一起重做（当前 `AmbiguousTypeArguments` 只认 `>` 后紧跟 `(` 或模板）。
2. **`new` 的覆盖判据依赖 `ParseNew` 的消费长度**：形状树只记 `new .. At-1`，子树节点不参与 covered。
   一旦 legacy 的 `ParseNew` 行为变化（比如新增 `new.target` 之外的形态），形状树可能「多记」或「少记」单元；
   `Covers` 会把不一致变成 `Decline`（安全），但也意味着这类语句会静默退回 legacy，读表时只能从
   `declined` 计数看出来。
3. **`At` 的临时改写**：`KindNew` / `KindTemplate` 两处 `builder.At = ...` 后复位。
   目前 `BuildNode` 的其它分支都不读 `At`（只读 `Units` / `Positions`），所以是安全的；
   但若以后有人在 AST 收口里加「依赖 At 的 legacy 调用」，需要同时检查这两处复位。
4. **对象字面量的嵌套判据是 `Nested` 标志**：它来自「括号 / 索引内部的嵌套体」，不是语法位置判定。
   `[{}]` / `f({})` 这两种实参由 legacy 整段建，形状层根本不看；所以「对象字面量在参数位置」目前是
   legacy 覆盖而不是形状树覆盖（不错树，只是不算接管）。
5. **case 文件被 JSON.stringify 重排**：`op-ast-cases.json` / `op-cases.json` 追加用例时整文件重写，
   diff 里带格式变化（内容只增）。若评审要求纯增量 diff，可后续用文本插入方式重做。