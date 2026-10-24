# HANDOFF — Stage 3l：箭头函数 / 函数表达式 / 类表达式

分支 `feature/possible-statement-s3l`，基线 `feature/possible-statement` @ 60759526。

本片只动形状层（`statement-operator-body.xl.md`）、AST 收口（`statement-shape-ast.xl.md`）与专用 cases；
`core/`、`StatementBoundaryUtil.IsAsiBoundary`、legacy 建造器一行未改。

## 1. 新增支持（三类，逐类形状层 + AST 层）

### 1.1 箭头函数 `x => x + 1` / `(a, b) => a + b` / `() => 1` / `x => { return x; }`

- 形状层 `KindArrow`：`=>` 到达时把当前表达式的最后一个子单元（一个 `KindIdentifier` 或一个 `KindParen`）
  原地变成 `KindArrow` 的唯一子节点（`ShapeInsertUtil.InsertBetween`），转 `ExpectArrowTail`。
  箭头体是**赋值表达式**，比任何二元运算符都低，所以 `=>` 之后的所有单元整段吞掉（表达式体多格 / 块体一格）。
- 参数表：`(a, b)` / `()` / 解构参数不是表达式，`BuildOperand` 在括号内嵌套体失败时返回
  **未解析参数表**（`KindParen`、`Data` 为空、渲染成 `params`）；只有后面真的来 `=>` 才成立，
  否则 `HasLooseParen` 立即 `Fail`（安全回 legacy，不建错树）。
- `IsComplete()`：`ExpectArrowTail` 下以 `ArrowBodyUnits > 0` 判完整（体永远回不到 `ExpectOperator`）。
- AST 层：`builder.At = 参数单元下标; ParseAssign()`，legacy 的箭头分支（单标识符参数走
  `ParsePostfixSuffix` 的 `=>` 分支、括号参数走 `ParseArrowFromBracket`）建
  `ParameterShape` / `EqualsGreaterThanToken` / 体，children / `Pos` / 区间与 legacy 同源。

### 1.2 函数表达式 `(function(){})` / `(function(a){ return a; })`

- 形状层 `KindFunction` 是**不透明操作数**：`function` 在操作数位置建节点挂进 `Top()`，转 `ExpectBody`；
  名字 / 类型参数 / 实参括号 / 返回类型全部整格跳过，第一个 `{…}` 括号（函数体）到达时收口。
- AST 层：`builder.At = function 下标; ParseFunctionExpression()`，消费长度决定 covered；
  `Covers` 不一致就 `Decline`（安全）。

### 1.3 类表达式 `(class {})` / `(class C { m(){} })`

- 形状层 `KindClass` 与 `KindFunction` 同构。**S3g 的 `Fail("class 表达式")` 守卫已替换**：
  `<` / `>` / `{` 在 `ExpectBody` 里被整格跳过，不再进 `PushBinary` / `BuildOperand`，
  所以 S3g 记录的错树路径（`class` `<` `T` `>` `{object}` 拼成「恰好完整」）不再成立。
- AST 层：`ParseClassExpression()` 整段建（名字 / 类型参数 / 遗产子句 / 成员都由 legacy 建）。

## 2. 未覆盖清单（安全回退，逐条 `Fail` / `Decline` → legacy，不建错树）

- `async` 箭头：`async (x) => x` 在**路由层**就被跳过（壳体根本没建，`shapeAst=0` 且 `declined=0`），
  所以它不构成「declined 取证」，本片未接管；`async function` 同理；
- 生成器 `function*` / 泛型 `class<T>`：形状层能吞（`ExpectBody` 跳过），AST 正确性完全取决于
  legacy `ParseFunctionExpression` / `ParseClassExpression`，`Covers` 不一致即 `Decline`；
- 解构参数 / 默认参数 / rest 参数：参数表未解析（`params`），整段交 legacy——AST 正确，但形状层
  **不证明**参数结构；
- 箭头作为 `new` 的被构造者、`x => x` 后直接 `.a` 等形态：形状层按「体整段吞掉」解释，
  若 legacy 消费长度不同则由 `Covers` `Decline`；
- 逗号表达式仍不支持（`(a, b)` 只有在 `=>` 前才被当作参数表）。

## 3. 专用 cases（`op-ast-cases.json` group `ast-from-shapes`，新增 12 条）

每条断言：①壳 XML == legacy XML 逐字节；②`StatementShapeAst.TotalShapeAst` 达到期望；③形状结构文本
与 `ts.createSourceFile` 渲染一致（箭头 / 函数 / 类 TS 渲染返回 null，用 `tsTexts: []` 显式声明）；
④`counts` 直接数 AST 里的 `ArrowFunctionShape` / `FunctionExpressionShape` / `ClassExpressionShape`。

```
s3l-arrow-ident + s3l-arrow-empty + s3l-arrow-params + s3l-arrow-paren + s3l-arrow-block
s3l-arrow-paren-expr + s3l-arrow-call + s3l-arrow-add
s3l-function-paren + s3l-function-named
s3l-class-bare + s3l-class-named
```

「未覆盖 → declined 安全回退」的取证沿用同组既有 `s3g-declined-assign`（`a = b;`：`shapeAst=0` 且 `declined>0`）。

## 4. 全表读数（本分支实测）

| 门 | 读数 |
| --- | --- |
| xl_build（core+typescript, ts） | 887 written / 0 error |
| tsc -p tsconfig.json | 0 error |
| op-ast-proof（ast-from-shapes） | **74/74**（新增 12 条全 PASS） |
| op-proof（operators-live） | **40/40** |
| harness --group=operators-live | 40 pass / 0 fail |
| harness --group=dev | 22/22（exit 0） |
| harness --all | 101 pass / 0 fail / known 1 / skip 3 |
| harness --double-accept | cases=120 failed=0，冲突 0 |
| harness --lint | PASS |
| validate | 1720 条 / 0 不合格 |
| ast-json | 6167/6167 cj-ok；status 空；ast-json-diff 6167/6167 完全一致 |
| token-ast | total=1716 ok=1706 crash=0 diff=0 ts-invalid=10 |
| real-dts | 226/226 |
| feas-operator harness | 6/6 |
| insert-between | 9/9 |
| perf | long n=300 median 5.36ms（599 tokens）；many 2000 语句 32.03ms；scale ratio 2.07 / 2.23（线性） |

## 5. 风险

1. **箭头体「整段吞掉」是语法事实**（体是赋值表达式），但形状层因此不再证明体内部结构；
   体正确性完全由 legacy `ParseAssign` 与 `Covers` 保证（不一致即 `Decline`，不会建错树）。
2. **参数表未解析**（`params`）：形状文本对 `(a, b)` 与 `()` 无法区分，这是刻意的保守；`counts` 才钉得住 AST。
3. **`ExpectBody` 的「第一个 `{` 是体」判据**：函数 / 类头部里不会出现 `{`（实参括号 / 类型参数 / 遗产子句
   都不含花括号），所以这里安全；若以后支持「类字段初始化里的对象字面量」等形态需要重新审。
4. **`At` 临时改写**：箭头 / 函数 / 类三处 `builder.At = …` 后复位，与 S3g 的 `new` / 模板同口径。
5. **class 守卫被替换**：`(class {})` 现在由形状树接管，S3g 的 §5.1 风险条目已关闭；但 `class` 的复杂头部
   （装饰器 / 泛型 / 抽象）只由 `ExpectBody` 跳过，若 legacy 消费长度与跳过格数不一致，`Covers` 会 `Decline`。