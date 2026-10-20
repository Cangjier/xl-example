# expressions 族覆盖记录

本文件记录 `typescript/cases/expression.ts` 逐块收进来的表达式构造、AST 口径与剩余缺口。
判定尺子只有 `typescript/cases/ast-json.mjs` + `ast-json-diff.mjs`（本分支上 `tests/parse/*` 读的是另一分支产物）。

## chunk 1（cover-expressions-1）：箭头函数（表达式体）+ 类表达式（空类体）+ `=>`

实现落点：`typescript/tokens/expressions/expression-builder.xl.md`

- `ParsePrimary`：`(` 后紧接 `=>` 时走新方法 `ParseArrowFromBracket`；`class` 走新方法 `ParseClassExpression`；
- `ParsePostfix`：`标识符` 后紧接 `=>` 时把该 `Identifier` 包成 `Parameter` 再建 `ArrowFunction`；
- `MakeOperatorToken`：补 `=>` → `EqualsGreaterThanTokenShape`；
- 子形状：`ArrowFunctionShape`（容器）、`ParameterShape`（参数容器，子节点是 `Identifier`）、
  `EqualsGreaterThanTokenShape`（叶子）、`ClassExpressionShape`（空类体容器，无 children）。
  `Parameter` 不带 `Name` 字段（TS 侧 Parameter 也没有名字字段，带上会变「字段差」）。

### AST 口径（TS 实测，`ts.createSourceFile`）

| 构造 | TS children 顺序 / 区间 |
| --- | --- |
| `() => 1;` | `ArrowFunction[0,7)` → `EqualsGreaterThanToken[2,5)`、`NumericLiteral[5,7)`；无 Parameter |
| `(a) => a;` | `ArrowFunction[0,8)` → `Parameter[1,2)`→`Identifier[1,2)`、`EqualsGreaterThanToken[3,6)`、`Identifier[6,8)` |
| `(a, b) => a;` | 两个 `Parameter`（`[1,2)` / `[3,5)`），再 `=`、再 body；逗号不进 AST |
| `a => a;` | `Parameter[0,1)`、`EqualsGreaterThanToken[1,4)`、`Identifier[4,6)` |
| `(a) => ({ x: a });` | body 是 `ParenthesizedExpression[6,17)` → `ObjectLiteralExpression[8,16)` |
| `(class {});` | `ParenthesizedExpression[0,10)` → `ClassExpression[1,9)`；空类体时 `ClassExpression` 无 children |

区间换算沿用 IMPORTANCE §4：`shape.Pos` 含前导 trivia（= 前一个非 trivia 单元 `End.Index + 1`），
`End = SourceRange.End.Index + 1`。所以 `(a) => a` 的 `Parameter.Pos = 1`（`(` 的下一位），
`(a, /* c */ b) => a` 的第二个 `Parameter.Pos = 3`（逗号结束 + 1，注释算前导 trivia），
与 TS 的 `pos` 完全同口径。

### 读数

```
expression  288 / 288            # 265（E1–E3）+ 23（base 21 箭头 21 条、base 22 类表达式 2 条）
全量        805 / 805            # expression 288 + string 75 + import 54 + export 62 + number 70 + regex 256
```

### 暂缓（附依赖）

- `async (a) => a;` / `async a => a;` ← 依赖 cover-end-1：`ExpressionStatementPossibleShape.CanStart` 放行 `async`；
- 块体箭头 `(a) => { … }`、函数表达式 `(function () {})` ← 依赖 cover-statements-1 的 `BlockShape`；
- 泛型箭头 `<T>(a) => a`、参数类型标注 `(a: T) => a`、默认参数 `(a = 1) => a` ← 依赖 cover-types-1 的 `ParseType`
  与参数默认值产生式；
- `as` / `satisfies` / 泛型实参 `f<T>(a)` / 尖括号断言 `<T>a` ← 依赖 cover-types-1 的 `ParseType`；
- 带类体成员的类表达式 `(class { m() {} })` ← 依赖 members / statements 家族的成员形状（当前显式报错，不静默错树）。

### 下一 chunk 建议

1. 数组字面量 `[a, b]`：builder 分支已就绪，只差 `ExpressionStatementPossibleShape.CanStart` 放行 `[`；
2. `import.meta`：`MetaProperty` 产生式 + import 候选在 `Symbol "."` 处 `Reject`（见 expression-ast-analysis §4.4）；
3. 块体箭头 / 函数表达式：等 cover-statements-1 的 `BlockShape` 落地后同批收；
4. 泛型 / `as` / `satisfies`：等 cover-types-1 的 `ParseType` 入口。

## chunk 2（cover-expressions-2，从 origin/integration @53b5cae7）：对象字面量成员分派

本块只改 `expression-builder.xl.md`（exprsesions 家族）+ `typescript/cases/members.ts`（只取消注释目标行）；
members 家族已就绪的 `PropertyAssignmentShape.FromParts` / `ShorthandPropertyAssignmentShape.FromParts` /
`SpreadAssignmentShape.FromExpression` 一次没动，`parameter-shape` 也没动。

### 实现落点

- `ParseObjectLiteral` 从「`ParseName` 后必须 `:`」改为四分派：
  1. `...` → `SpreadAssignmentShape.FromExpression(dotDotDot, expr, …)`（`...` 只进区间、不进 Data）；
  2. `名字 : 值` → `PropertyAssignmentShape.FromParts(name, value, …)`；
  3. `名字 = 值` → `ShorthandPropertyAssignmentShape.FromParts(name, initializer, …)`，再把等号插进
     `Data` 中间（TS 的 children 是 name / EqualsToken / initializer 三个，Factory 只装首尾两个；
     members 家族 shape 不在本块写范围，所以由 builder 插入 `FirstAssignmentShape`）；
  4. 其余 → `ShorthandPropertyAssignmentShape.FromParts(name, null, …)`（只有 name 一个子节点）。
- 新增 `ParsePropertyName`：`PropertyName` 允许 `IdentifierName` | `StringLiteral` | `NumericLiteral` | `BigIntLiteral`；
  字符串/数字/bigint 走各自字面量的 `FromBasicToken`，其余回落 `ParseName`（关键字名仍是 Identifier，与 TS 一致）。
- `Pos` 一律按 IMPORTANCE §4：`Positions[成员起点]` = 前一个非 trivia 单元 `End.Index+1`。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `({ a });` | `ShorthandPropertyAssignment[2,4)` → `Identifier[2,4)` |
| `({ a = 1 });` | `ShorthandPropertyAssignment[2,8)` → `Identifier[2,4)`、`FirstAssignment[4,6)`、`NumericLiteral[6,8)` |
| `({ ...a });` | `SpreadAssignment[2,7)` → `Identifier[6,7)`；`...` 不是节点，但 pos 从 `...` 起 |
| `({ "s": 1 });` | `PropertyAssignment[2,9)` → `StringLiteral[2,6) "s"`、`NumericLiteral[7,9)` |
| `({ 1: 2 });` | `PropertyAssignment[2,7)` → `NumericLiteral[2,4) "1"`、`NumericLiteral[5,7)` |
| `({ 1n: 2 });` | `PropertyAssignment[2,8)` → `BigIntLiteral[2,5) "1n"`、`NumericLiteral[6,8)` |

### 读数（integration 基线 951/951）

```
members     124 / 124            # 76（M1–M6 chunk 1）+ 48（base 7~9：shorthand 18、spread 15、字面量名 15）
全量        999 / 999            # 951 + 48；其它 8 个构造条数与读数不变
```

### 暂缓（附依赖，members.ts 顶部注释同步）

- object method `({ m() {} })` ← `MethodDeclarationShape`（types 家族）+ `BlockShape`（statements 家族）；
- get / set accessor `({ get a() {} })` ← `GetAccessorDeclarationShape` / `SetAccessorDeclarationShape`（types 家族）；
- computed property name `({ [a]: 1 })` ← `ComputedPropertyNameShape`（types 家族）；
- `$` 开头的名字 `({ $a: 1 })` / `({ a$b: 1 })` ← `Common` basic token 不收 `$`，属用户决策项（不动 core）；
- async 箭头 / 块体箭头 / 函数表达式 / as / satisfies / 泛型实参 / import.meta 同 chunk 1 的依赖。

### 下一 chunk 建议

1. 数组字面量 `[a, b]` 与 `import.meta`（chunk 1 留的两项，仍是最便宜的增量）；
2. `$` 名字需要用户对 basic token 的裁决，届时 `({ $a: 1 })` 一条即可转绿；
3. method / accessor / computed 等 cover-types-1 落地后，`ParseObjectLiteral` 的成员分派再扩三支即可。

## chunk 3（cover-expressions-3，从 origin/integration @cbb8dc0f）：as / satisfies + 泛型实参调用

本块只改 `expression-builder.xl.md`（expressions 家族）+ `expression.ts` + 本文件；复用已合并的
`TypeBuilder`（types chunk 1），未动 types 家族 shape、未动 `expression-statement-possible-shape`（cover-end-1）、
未动 `parameter-shape`（types-2）。

### 实现落点

- `ParseBinary` 的二元循环里新增类型运算符分支：`as` / `satisfies` 按**关系运算符优先级 11（左结合）**处理，
  左操作数是已解析的表达式，右操作数交给新方法 `ParseFollowingType()`（`TypeBuilder.Load(剩余单元, Positions[At])` +
  `ParseType()`，读完把 `At` 推进）。这样与 TS 实测一致：`a + b as T` = `(a + b) as T`，`a as T + b` = `(a as T) + b`。
- `ParsePostfix` 新增泛型调用分支：`CanStartTypeArgumentCall(At)` 做前瞻——`<` 扫到配对的 `>` 且 `>` 后紧跟 `(` 才算
  泛型调用；`ParseTypeArgumentsAtCurrent()` 用 `TypeBuilder.ParseTypeArguments()` 读实参，然后按
  `CallExpression(callee, 类型实参们, 调用实参们)` 的 TS children 顺序装。前瞻失败就落回 `ParseBinary` 的二元比较，
  所以 `a < b` / `a < b > c` / `f(a < b)` 一条没坏。
- 未改任何 shape：`AsExpressionShape` / `SatisfiesExpressionShape` 只做容器（children 由 builder `Add`），
  `TypeReference` 等类型节点全部来自 `TypeBuilder`。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `a as T;` | `AsExpression[0,6)` → `Identifier[0,1)`、`TypeReference[4,6)`→`Identifier[4,6)` |
| `a satisfies T;` | `SatisfiesExpression[0,13)` → `Identifier[0,1)`、`TypeReference[11,13)` |
| `a as T as U;` | 左结合：外层 `AsExpression` 的 children 是内层 `AsExpression` + 第二个 `TypeReference` |
| `a + b as T;` | `AsExpression[0,10)` → `BinaryExpression[0,5)`、`TypeReference[8,10)` |
| `a as T + b;` | `BinaryExpression[0,10)` → `AsExpression[0,6)`、`PlusToken[6,8)`、`Identifier[8,10)` |
| `f(a as T);` | `CallExpression[0,9)` 的实参是**一个** `AsExpression[2,8)`（不再变成 3 个 Identifier） |
| `f<T>(a);` | `CallExpression[0,7)` → `Identifier[0,1)`、`TypeReference[2,3)`、`Identifier[5,6)` |
| `f<T, U>(a, b);` | `CallExpression` → callee、两个 `TypeReference`、两个实参 |
| `f<T<U> >(a);` | 嵌套 `TypeReference`（`<`/`>` 之间留空格，两个 `>` 是独立单元） |

### 读数（integration 基线 1200/1200）

```
expression  329 / 329            # 288（chunk 1/2 后）+ 41（base 23 as/satisfies 21 条、base 24 泛型调用 20 条）
全量        1241 / 1241          # 1200 + 41；其余 11 个构造条数与读数不变
```

### 暂缓（附依赖）

- 尖括号断言 `<T>a;` 与泛型箭头 `<T>(a) => a;` ← 依赖 cover-end-1 的 `CanStart` 放行 `<`（builder 分支未写）；
- `f<T<U>>(a);`（连写 `>>`）：`>>` 在 token 层是**一个**组合 `Symbol`，要拆它属 basic token 用户决策项；
  留空格的 `f<T<U> >(a)` 已收；
- `a as A.B;` / `a as A.B.C;`：AST 侧形状已能建，但 TS 反查名是 `FirstNode`，`ast-json.mjs` 缺
  `["FirstNode","QualifiedName"]` 别名（与 `types.ts` 同一处 harness 缺口，不是 shape 缺口）；
- import.meta（下一波）、await / yield / new.target、块体箭头 / 函数表达式 / async 箭头 ← 同前几块的依赖。

### 下一 chunk 建议

1. 数组字面量 `[a, b]`（builder 已就绪，只差 `ExpressionStatementPossibleShape.CanStart` 放行 `[`）；
2. `import.meta`（`MetaProperty` + import 候选在 `.` 处 Reject，见 expression-ast-analysis §4.4）；
3. 等 cover-end-1 放行 `<` 后同批收 `<T>a` / `<T>(a) => a`；`f<T<U>>` 需先有 `>>` 拆 token 的用户决定；
4. 若允许动 harness：给 `ast-json.mjs` 补 `FirstNode → QualifiedName` 别名，可一次解锁 `as A.B` 与 `types.ts` 的限定名。

## chunk 4（cover-expressions-4，从 origin/integration @89413f7d + merge cover-expressions-3）：块体箭头 + 函数表达式

本块只改 `expression-builder.xl.md`（expressions 家族）+ `expression.ts` + 本文件。**消费**了 statements chunk1 的
`StatementBuilder`（不编辑 statements 文件），复用 types chunk2 的 `ParameterShape`；未动
`expression-statement-possible-shape`（cover-end-1）与 `parameter-shape`（types-2）。

### 实现落点

- 新增 `ParseArrowBody`：`=>` 之后紧跟 `{` 走 `ParseBlock()`（块体），否则仍走 `ParseAssign()`（表达式体）；
  `ParseArrowFromBracket` 与 `ParsePostfix` 的单标识符箭头两处共用。
- 新增 `ParseBlock`：块是**一个** `Bracket` 单元，交给 `new StatementBuilder(...).Load(Units.slice(At), Positions[At])`
  的 `BuildBlock()` 递归建（块内语句 = statements chunk1 的语句树），`At` 按 `builder.At` 推进。
- 新增 `ParseFunctionExpression`：`function` 起头；children 顺序与 TS 一致 —— 可选 `Identifier`（名字）、
  `Parameter` 们、`Block`。名字只进 `Data` 不设字段（TS 的 `FunctionExpression` 没有 `name` 字段）。
- 新增 `ParseFunctionParameters`：参数括号的 `Data` 交给子 `ExpressionBuilder`，每参数一个 `ParameterShape`，
  children = `Identifier`（+ 可选 `TypeReference`，类型走 `TypeBuilder`）；`Pos`/区间与 TS 同口径。
- `ParsePrimary` 的 `Common` 分支补 `function` → `ParseFunctionExpression`（函数表达式因此天然可出现在
  调用实参 / 对象值 / 数组元素 / 括号内等位置）。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `() => {};` | `ArrowFunction[0,8)` → `EqualsGreaterThanToken[2,5)`、`Block[5,8)` |
| `(a) => { return a; };` | `ArrowFunction[0,20)` → `Parameter[1,2)`、`EqualsGreaterThanToken[3,6)`、`Block[6,20)`→`ReturnStatement[8,18)` |
| `(a) => { let x = 1; };` | `Block[6,21)` → `VariableStatement[8,19)`（块内走 statements builder） |
| `(function () {});` | `ParenthesizedExpression[0,16)` → `FunctionExpression[1,15)` → `Block[12,15)` |
| `(function f() {});` | `FunctionExpression[1,16)` → `Identifier[9,11) "f"`、`Block[13,16)` |
| `(function f(a) { return a; });` | `FunctionExpression[1,28)` → `Identifier`、`Parameter[12,13)`→`Identifier[12,13)`、`Block[14,28)` |
| `(function (a: T) {});` | `Parameter[11,15)` → `Identifier[11,12)`、`TypeReference[13,15)` |
| `f(function () {});` | `CallExpression` 的一个实参是 `FunctionExpression` |

### 读数（integration + merge 后基线 1275/1275）

```
expression  364 / 364            # 329（chunk 1~3 后）+ 35（base 25 块体箭头 17 条、base 26 函数表达式 18 条）
全量        1310 / 1310          # 1275 + 35；其余 11 个构造条数与读数不变
```

### 暂缓（附依赖，expression.ts 注释同步）

- async 箭头 `async (a) => a` / `async () => {}` ← 依赖 cover-end-1 的 `CanStart` 放行 `async`；
- 默认参数 / 可选参数 / rest（`(a = 1) => a`、`(a?) => a`、`(function (a = 1) {})`）← 参数产生式未做；
- 箭头参数类型标注 `(a: T) => a` ← 箭头参数目前只收标识符（函数表达式参数已收 `a: T`）；
- 带成员的 class 表达式、object method / get / set ← 等 class element shapes；
- `<T>a` / 泛型箭头 ← 等 cover-end-1 放行 `<`；import.meta、await / yield / new.target 同前。

### 下一 chunk 建议

1. 数组字面量 `[a, b]`（builder 已就绪，只差 `ExpressionStatementPossibleShape.CanStart` 放行 `[`）；
2. `import.meta`（`MetaProperty` + import 候选在 `.` 处 Reject）；
3. 箭头参数默认值 / 可选 / rest：本块已把 `ParseFunctionParameters` 的骨架搭好，扩参数产生式即可；
4. 等 statements 家族把 class element 形状铺开后，带成员的 class 表达式与 object method / accessor 可同批收。

## chunk 5（cover-expressions-5，从 origin/integration @568463e9 + merge cover-expressions-4）：高级参数

本块只改 `expression-builder.xl.md` + `expression.ts` + 本文件；**未改 `parameter-shape`**（types 家族所有，
当前字段是 `ParameterName` / `QuestionToken` / `Type`，没有 RestToken 字段——rest 用 `DotDotDotToken` 子节点表达即可，
AST 对拍只读 `Data`）。`MakeOperatorToken` 补 `...` → `DotDotDotTokenShape`。

### 实现落点

- `ParseFunctionParameters` 扩成完整参数产生式：`...`? 名字（`?`）?（`: 类型`）?（`= 默认值`）?；
  箭头（`ParseArrowFromBracket`）与函数表达式（`ParseFunctionExpression`）共用，箭头不再只收标识符。
- children 顺序严格按 TS：`DotDotDotToken`、`Identifier`、`QuestionToken`、类型节点、initializer。
- 默认值用 `ParseAssign` 解析；类型走 `TypeBuilder.ParseType`；`Pos` 取参数第一个单元（`...` 或名字）的含前导 trivia 起点，
  区间到最后一个子节点结束。

### AST 口径（TS 实测；与工单括注不同处以此为准）

| 构造 | TS children / 区间 |
| --- | --- |
| `(a: A) => a;` | `Parameter[1,5)` → `Identifier[1,2)`、`TypeReference[3,5)`；`EqualsGreaterThanToken[6,9)` |
| `(a = 1) => a;` | `Parameter[1,6)` → `Identifier[1,2)`、`NumericLiteral[4,6)`；**没有 EqualsToken 子节点** |
| `(a: A, b = 1, ...c) => a;` | 三个 `Parameter`：`[1,5)`（name+type）、`[6,12)`（name+initializer）、`[13,18)`（`DotDotDotToken[13,17)`+`Identifier[17,18)`） |
| `(...a) => a;` | `Parameter[1,5)` → `DotDotDotToken[1,4)`、`Identifier[4,5)`；Parameter 的 pos 从 `...` 起 |
| `(function (a?) {});` | `Parameter[11,13)` → `Identifier[11,12)`、`QuestionToken[12,13)` |
| `(function (a = 1) {});` | `Parameter[11,16)` → `Identifier[11,12)`、`NumericLiteral[14,16)`（同样没有 `=` 子节点） |

> 注意：工单里写「Parameter children 含 EqualsToken」，但 TS 实测 `Parameter` 的 forEachChild **不含** EqualsToken
> （只有 `{ a = 1 }` 的 ShorthandPropertyAssignment 才含）；本块按实测建树。

### 读数（merge 后基线 1410/1410）

```
expression  397 / 397            # 364（chunk 1~4 后）+ 33（base 27 箭头高级参数 18 条、base 28 函数表达式参数 15 条）
全量        1443 / 1443          # 1410 + 33；其余 12 个构造条数与读数不变
```

### 暂缓（附依赖，expression.ts 注释同步）

- async 箭头 `async (a) => a` / `async () => {}` ← 依赖 cover-end-1 的 `CanStart` 放行 `async`；
- 解构参数 / 参数装饰器（`(function ({ a }) {})`）← 依赖 bindings / decorator 家族；
- `<T>a` / 泛型箭头 ← 等 cover-end-1 放行 `<`；import.meta、await / yield / new.target 同前；
- 带成员的 class 表达式、object method / get / set ← 等 class element shapes；数组语句起点 ← 等 `CanStart [ ]`。

### 下一 chunk 建议

1. 数组字面量语句起点 `[a, b];`（builder 已就绪，只差 `ExpressionStatementPossibleShape.CanStart` 放行 `[`）；
2. `import.meta`（`MetaProperty` + import 候选在 `.` 处 Reject）；
3. 等 cover-end-1 放行 `async` / `<` 后同批收 async 箭头与泛型箭头；
4. class element 形状就绪后收带成员 class 表达式与 object method / accessor。

## chunk 6（cover-spread-new-1，从 origin/integration @1ccce3cc）：spread 实参/数组元素 + 泛型 new

本块只改 `expression-builder.xl.md` + 新增 `typescript/cases/spread-forms.ts` + 本文件；
没有改 `expression-statement-possible-shape`、其它家族、`core/**`。`SpreadElementShape` / `NewExpressionShape`
都沿用已有空壳（容器，children 由 builder `Add`），没有新增或修改 shape。

### 实现落点

- `ParseBracketArguments`：遇 `...` 先推进一颗单元，再 `ParseAssign()` 解析被展开的表达式，
  建 `SpreadElementShape`（children 只有 expression），`SpanNode` 的起点取 `...` 单元（Pos 含前导 trivia、
  区间从 `...` 起），然后作为实参 push。调用实参 / new 实参共用这一条，`new C(...a)` 自动一起绿。
- `ParseArrayLiteral`：同样的 `...` 分支，建 `SpreadElement` 作为数组元素（元素间逗号仍不进 AST）。
- `ParseNew`：callee 链（`.` / `[]`）解析完之后、实参之前，若 `CanStartTypeArgumentCall(this.At)`
  成立（沿用泛型调用的 `<`→配对 `>` 且后随 `(` 前瞻），就 `ParseTypeArgumentsAtCurrent()`
  读出 `TypeReference` 们，按 TS 顺序 `Add`：callee → 类型实参 → arguments。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `f(...a);` | `CallExpression[0,7)` → `Identifier[0,1)`、`SpreadElement[2,6)`→`Identifier[5,6)` |
| `f(a, ...b, c);` | 三个实参：`Identifier`、`SpreadElement[4,9)`、`Identifier` |
| `([...a]);` | `ArrayLiteralExpression` 的元素是 `SpreadElement[3,7)`→`Identifier[6,7)` |
| `new C(...a);` | `NewExpression` → `Identifier C`、`SpreadElement`→`Identifier` |
| `new C<T>();` | `NewExpression[0,10)` → `Identifier[3,5)`、`TypeReference[6,7)`（无实参节点） |
| `new C<T, U>(a);` | `NewExpression` → callee、两个 `TypeReference`、`Identifier a` |
| `new a.b<T>();` | callee 是 `PropertyAccessExpression`，其后是 `TypeReference` |

### 读数（integration 基线 1873/1873）

```
spread-forms  30 / 30            # spread 实参 14 + spread 数组元素 10 + 泛型 new 7（含 trivia）
全量         1903 / 1903         # 1873 + 30；其余 18 个构造读数不变（expression 491 / async-arrows /
                                 # type-assertions / import-meta 等全部保持绿）
```

### 暂缓（附原因）

- 语句首数组字面量 `[...a];` / `[a, ...b];` —— `ExpressionStatementPossibleShape.CanStart` 仍不放行 `[`（不属本块写范围，
  用 `([...a]);` / `x = [...a];` / `f([a, ...b]);` 测量同一产生式）；
- 泛型 new 无实参形式 `new C<T>;` 与 `new C<T>` 的更多 trivia 组合：本块只按工单收带 `(...)` 的三种；
- tagged template 的 spread 不是独立产生式（`tag(...a)` 就是普通调用实参，已被 `f(...)` 覆盖）；
- 其余表达式族暂缓项（`<T>a`、import.meta、await/yield、类表达式成员等）见前几块。

### 下一 chunk 建议

1. 语句首 `[`（`CanStart` 放行）后，spread 数组元素可直接改成语句首写法，与 `expression.ts` 的数组用例合流；
2. 可选链 + spread（`f?.(...a)`）、`new` 的 `?.`/非空 callee 组合可顺带补测；
3. spread 在对象字面量 / 解构里已有独立路径（`SpreadAssignmentShape` / BindingElement），本块不重复。

## chunk 7（cover-generators-1，从 origin/integration @1a241388）：yield / yield*

本块改 `expression-builder.xl.md`：`ParseUnary` 在进入普通前缀运算符之前识别 Common `yield`，交给新方法 `ParseYield`。
FunctionDeclaration 的 `function*` 侧见 `docs/coverage-declarations.md`（generators 节）。

### 实现落点

- `ParseYield`：`yield` 单元之后若跟 `*`（Symbol）就建 `AsteriskTokenShape`（Pos = `yield` end+1）；
  再判断是否有 operand：下一个单元不是 `,` / `;` / `:` 就 `ParseAssign()`。children 顺序 = `AsteriskToken?`、operand?；
  `SpanNode` 从 `yield` 单元起算，`yield;` 无 children。
- 递归：`yield yield 1` 合法（operand 的 `ParseAssign` 再进 `ParseYield`）。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `yield;` | `YieldExpression[15,21)`，无 children |
| `yield 1;` | `YieldExpression[15,23)` → `NumericLiteral[21,23)` |
| `yield a + b;` | 一个 child：`BinaryExpression[21,27)`（operand 是赋值表达式层） |
| `yield* h();` | `AsteriskToken[21,22)`、`CallExpression[22,26)` |
| `x = yield;` | `BinaryExpression` 的右操作数是 `YieldExpression[19,25)` |
| `yield yield 1;` | 外层 `YieldExpression` 的 child 是内层 `YieldExpression` |

### 读数

```
generator-functions  27 / 27      # 与 function* 声明同表；本块新增 yield/yield* 共 14 条 + 优先级 3 条
全量                2271 / 2271   # 23 个构造；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓

- 顶层 `yield`（TS 视为标识符 / 诊断；`CanStart` 也不放行）、`async function*`、generator 表达式 / 方法、
  `yield` 后换行（受限产生式需 ASI 换行断句）——同 `docs/coverage-declarations.md` 的 generators 节。

## chunk 8（cover-obj-members-1，从 origin/integration @22e87cfe）：对象字面量 method/accessor/computed + class 表达式

本块只改 `expression-builder.xl.md`、新增 `class-expressions.ts`、追加 `members.ts` 与两份 docs；未改 members/declarations/statements。

### 实现落点

- `ParseObjectLiteral` 成员分派扩成：可选 `async` / `get` / `set` / `*` 修饰 → 名字（标识符 / 字面量 / `[computed]`）：
  - 后面是 `(` → 按 `MethodDeclarationShape` / `GetAccessorShape` / `SetAccessorShape` 建成员：
    参数 `ClassDeclarationShape.BuildParameters`、返回类型 `TypeBuilder`、函数体 `StatementBuilder.BuildStatement`；
    children 顺序 = `AsyncKeyword?` → `AsteriskToken?` → 名字 → `Parameter` 们 → 返回类型? → `Block`；
  - 否则仍走 PropertyAssignment / ShorthandPropertyAssignment / SpreadAssignment。
  `async` / `get` / `set` 都带「下一个是名字」的前瞻，所以 `({ get: 1 })`、`({ get() {} })` 不会被误判。
- 新增 `ParseComputedPropertyName`：`[expr]` → `ComputedPropertyName`（children 只有表达式），property / method 名共用。
- `ParseClassExpression` 从「只收空体」扩成完整类表达式：名字? → `HeritageClause` 们（`HeritageClauseShape.BuildClauses`）→
  成员（`ClassDeclarationShape.BuildMembers`）；两者都是**消费** declarations 的静态助手，未编辑 declarations 文件。
  `class` 后紧跟 `extends` 时不当名字（否则匿名 `class extends B` 会被吃掉）。

### AST 口径（TS 实测）

| 构造 | TS children |
| --- | --- |
| `({ m() {} });` | `MethodDeclaration[2,9)` → `Identifier[2,4)`、`Block[6,9)` |
| `({ m(a: A): B { return a; } })` | `MethodDeclaration` → 名字、`Parameter`、`TypeReference`(返回)、`Block` |
| `({ get x() { return 1; } })` | `GetAccessor[2,24)` → `Identifier[6,8)`、`Block[10,24)`（`get` 不是节点） |
| `({ set x(v) {} })` | `SetAccessor` → 名字、`Parameter`、`Block` |
| `({ [k]: 1 })` | `PropertyAssignment` → `ComputedPropertyName[2,6)`、`NumericLiteral[7,9)` |
| `({ [k]() {} })` | `MethodDeclaration` 的名字是 `ComputedPropertyName` |
| `({ *m() {} })` | `MethodDeclaration` → `AsteriskToken[2,4)`、`Identifier[4,5)`、`Block[7,10)` |
| `({ async m() {} })` | `MethodDeclaration` → `AsyncKeyword[2,8)`、`Identifier[8,10)`、`Block[12,15)` |
| `(class { x = 1; });` | `ClassExpression[1,17)` → `PropertyDeclaration[8,15)` |
| `(class C { m() {} });` | `ClassExpression` → `Identifier C`、`MethodDeclaration` |
| `(class extends B { m() {} });` | `ClassExpression` → `HeritageClause[6,16)` → `ExpressionWithTypeArguments[14,16)`、`MethodDeclaration` |

### 读数（本块基线 2461/2461）

```
members            141 / 141      # base 10 新增 17 条（method/get/set/computed/generator/async + 混合 + trivia）
class-expressions   17 / 17      # 空体/名字/属性/方法/constructor/计算名/extends/trivia
全量              2495 / 2495     # 2461 + 34；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓

- decorators（`@dec`）、static block（`static {}`）、private `#x` alias fields ← class extras 分支；
- heritage 里放 class 表达式（`class extends (class {})`）← heritage 目前走 TypeBuilder，需要 ParseExpression 分支；
- 对象字面量里的 rest 之外的更多修饰组合、以及 class 表达式 type parameters 未收。

## chunk 11（cover-expr-sweep-1，从 origin/integration @c5cf9a25）：expression measurement sweep

measurement-only：只 append `expression.ts` / `expression-chains.ts` + 本节，未改任何 shape / builder。

### 新增（全绿，oracle 先验）

- 模板字面量：`` `a` ``、`` `a${b}c` ``、`` `${a}${b}` ``、嵌套 `` `a${`b${c}`}d` ``、tagged `` tag`a${b}` `` / `` tag`x` `` / `` tag`${a}` ``，以及 `` `a${ /* c */ b}c` ``、`` tag /* c */ `a${b}` ``、`` `a${b /* c */}c` ``、`` tag\n`x` `` trivia。
- 逻辑链：`a ?? b ?? c;`、`a ?? b ?? c ?? d;`（`a ?? b` / `a && b || c` 已在前面的 base）。
- optional chain 组合（expression-chains §7）：`a?.[b]?.(c)`、`a?.b?.[c].d`、`a?.(b)?.[c]`、`a?.[b]?.(c)?.[d]` + trivia。
- class 上下文：`class C { m() { return new.target; } }`（MetaProperty 已可测）。
- unary/binary/logical-assign/sequence/new 组：检查后确认既有 base 已覆盖（`typeof a`、`void a`、`delete a.b`、`a in b`、`a instanceof B`、`a ** b`、`a **= b`、`~a`、`!a`、`-a`、`+a`、`a >>> b`、`a <<= b`、`a &&= b`、`a ||= b`、`a ??= b`、`(a, b, c)`、`new C()` 等），本 sweep 不重复。

### 读数

```
expression        542 / 542      # 529 + 13（base 33：模板 11 + 逻辑链 2 + new.target 1，super 行暂缓）
expression-chains  42 / 42       # 36 + 6（§7 optional chain 组合）
全量             2899 / 2899     # 30 个构造；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓（已写成注释目标 + 原因）

- `super.m();` / `super.a;`（class 内）：builder 的 ParsePrimary 把 `super` 当 Identifier，没有 SuperKeyword 产生式；
  属 expression-builder 改动，本 sweep 是 measurement-only，先记目标。
- `a as const` 等语义错误形态、`super()` 构造器调用不入语料（TS 只报诊断/语义错）。
## chunk 12（cover-super-1）：SuperKeyword（class 体内的 super 调用 / 属性访问）
本块只改 `expression-builder.xl.md`（ParsePrimary 的 `Common` 分派补 `super`）+ 追加 `expression.ts`；未改 class-declaration / statements / core。
- `ParsePrimary` 的 `Common` 分支在 `new` / `class` / `function` 之后新增：
  `if (text === "super") { this.At++; return this.MakeKeywordLeaf(new SuperKeywordShape(this.Template), start); }`
  —— `super` 从此是 `SuperKeyword`（不是 `Identifier`），后续 `.` / `[]` / `(` 由 ParsePostfix 照常组装成
  `PropertyAccessExpression` / `ElementAccessExpression` / `CallExpression`。
- `MakeKeywordLeaf` 负责区间与 `Pos`（含前导 trivia），与 this / true 等关键字同口径；未新增字段。
| `super.m();` | `CallExpression` → `PropertyAccessExpression`（`SuperKeyword`、`Identifier m`） |
| `super.x` | `PropertyAccessExpression` → `SuperKeyword`、`Identifier x` |
| `super();` | `CallExpression` → `SuperKeyword`（无实参节点） |
| `super(a);` | `CallExpression` → `SuperKeyword`、`Identifier a` |
| `super.m().n` | `PropertyAccessExpression` 的 expression 是 `CallExpression`（callee 为 `super.m`） |
| `super["m"]` | `ElementAccessExpression` → `SuperKeyword`、`StringLiteral "m"` |
expression  550 / 550      # base 34：super 调用/属性/链/计算访问 8 条 + trivia 3 条
全量       2909 / 2909     # 30 个构造；结构差 0 / 位置差 0 / 字段差 0
- class 外的 `super`（TS 语义错误）；object method 里的 `super`（语义依赖 home object，语法可解析但语义侧不收）；
- `super` 出现在 heritage（`class C extends super.X`）等非法形态不入语料。
## chunk 13（cover-private-access-1）：private 成员访问 `this.#x` / `this.#m()`

本块只改 `expression-builder.xl.md` 的成员访问后缀（`.` 分支）+ 追加 `expression.ts`；未碰 class-declaration / statements / core。

### 实现落点

- `ParsePostfix` 的 `text === "."` 分支在 `ParseName()` 之前先看下一颗单元：
  如果是 `Symbol "#"`，就把 `#` + Common name 折成 `PrivateIdentifierShape`（SignIn 用 `#` token、SignOut 用名字 token、
  `Pos` = `#` 的含前导 trivia 起点），否则沿用原来的 `ParseName()` 路径（Identifier / 字面量名不受影响）。
- 之后的 `.` / `[]` / `(` 后缀逻辑完全复用：`this.#x` → PropertyAccessExpression(ThisKeyword, PrivateIdentifier)；
  `this.#m()` → CallExpression(PropertyAccessExpression(this, #m))。

### AST 口径（TS 实测）

| 构造 | TS children |
| --- | --- |
| `this.#x` | `PropertyAccessExpression` → `ThisKeyword`、`PrivateIdentifier` |
| `this.#x = 2` | `BinaryExpression` → `PropertyAccessExpression`、`FirstAssignment`、`NumericLiteral` |
| `this.#m()` | `CallExpression` → `PropertyAccessExpression`（`this`、`#m`） |
| `C.#x`（static private） | `PropertyAccessExpression` → `Identifier C`、`PrivateIdentifier #x` |
| `obj.#x`（class 外） | 语法上同为 `PropertyAccessExpression`（TS 解析无诊断；语义检查才报错） |

### 读数

```
expression  575 / 575      # base 35：read/write/+1 / #m() / #m(a) / #m().n / static C.#x / obj.#x + 3 trivia
全量       3054 / 3054     # 30 个构造；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓

- optional private access `obj?.#x`（`?.` 分支还未接 private 名字，语法合法）；
- `#x in obj` brand check 已由 base 30 覆盖；`super`/`new.target` 回归由既有 base 覆盖。
## chunk 14（cover-expr-sweep-3）：成员体内的 super / new.target / yield / await（measurement-first）

本块 **未改任何 builder / shape**：先把每个候选形态加进 members.ts / expression.ts 并对拍，结果全部一次转绿，
因此不需要动 `expression-builder`。只 append 用例 + 本节。

### 新增（全绿）

- object literal 方法里的 `super`：`({ m() { return super.x; } })`、`({ m() { super.m(); } })`、getter 里的
  `super.y`、链式 `super.m().n`、计算访问 `super["x"]`、以及 `super /* c */ . x` trivia。
- class generator / async 方法体内的 yield / await：`class C { *m() { yield 1; } }`、
  `class C { async *m() { yield* g(); } }`、`class C { *m() { const x = yield; } }`、
  `class C { async m() { await g(); } }`、`class C { async *m() { await g(); yield 1; } }`、
  `class C { *m() { yield yield 1; } }` + 注释 trivia。
- class static block：`class C { static { } }`、`class C extends B { static { super.x; } }`（该 integration 上已能建树）。
- function 上下文里的 `new.target`：`function f() { return new.target; }`、嵌套函数、函数内箭头、函数表达式、
  `new.target /* c */`、`function /* c */ f()` trivia。

### 读数

```
members     169 / 169      # 153 + 16（object super 6 + class generator/async 8 + static block 2）
expression  598 / 598      # 592 + 6（function 内的 new.target 4 + trivia 2）
全量       3309 / 3309     # 3287 + 22；结构差 0 / 位置差 0 / 字段差 0
```

### 红→绿清单

无：全部候选形态在测量前已支持（super / yield / await / new.target / static block 的既有产生式组合即可覆盖）。
## chunk 15（cover-arrow-predicates-1）：箭头 / 函数表达式的返回类型（含 TypePredicate）

### 实现落点

- `ParsePrimary` 的 `(` 前瞻从「下一颗是 `=>`」扩成「下一颗是 `=>`，或下一颗是 `:` 且后面能找到 `=>`」：
  这样 `(x: any): x is A => true` 和 `() : void => {}` 才走箭头路线；单独 `:` 仍回退到括号表达式
  （避免把 `a ? (b, c) : d` 误判成箭头）。
- `ParseArrowFromBracket`：参数之后可选 `: 返回类型`，类型单元交给 `TypeBuilder.ParseReturnType()`
  （内部会把 `x is A` / `asserts x is A` 分流成 `TypePredicate`，其余走 `ParseType`），按 TS children 顺序
  插在 Parameter 之后、`EqualsGreaterThanToken` 之前。
- `ParseFunctionExpression`：参数之后、函数体 `{` 之前同样可选 `: 返回类型`，同样走 `ParseReturnType()`。

### AST 口径（TS 实测）

| 构造 | children |
| --- | --- |
| `(x: any): x is A => true` | `ArrowFunction` → `Parameter`、`TypePredicate`（Identifier x + TypeReference A）、`EqualsGreaterThanToken`、body |
| `(x: any): asserts x is A => {}` | TypePredicate 前面多一个 `AssertsKeyword` |
| `(function (x: any): x is A { return true; })` | `FunctionExpression` → `Parameter`、`TypePredicate`、`Block` |
| `(a): A => a` | ArrowFunction → Parameter、`TypeReference`、`EqualsGreaterThanToken`、body |

### 读数

```
expression  609 / 609      # 598 + 11（base 37：谓词箭头/函数表达式 + 普通返回类型 + 嵌套 + trivia）
全量       3430 / 3430     # 3419 + 11；结构差 0 / 位置差 0 / 字段差 0
```
## chunk 16（cover-instantiation-1）：instantiation expressions / const 类型参数 / 泛型类表达式 / 泛型对象方法

### 实现落点（只改 expression-builder）

- **Instantiation expression（TS 4.7）**：新增 `CanStartTypeArguments(index)` —— 与 `CanStartTypeArgumentCall`
  同样的 `<`/`>` 配对扫描，但 `>` 后必须跟「不能再续比较链」的单元（`;` `,` `)` `]` `}` `=` `.` `!` `?` `:` `=>` `?.` 或单元结束）。
  `ParsePostfix` 在泛型调用分支之前先走该分支，把 `<...>` 建成 TS 的 `ExpressionWithTypeArguments`
  （expression + 每个类型实参；复用既有 shape，Expression/TypeArguments 字段 + SignIn/SignOut 到 `>`）；
  `ParseNew` 的类型实参条件也接受该形态（`new C<number>` 无实参列表）。
- **const 类型参数（TS 5.0）**：`ParseAngleTypeParameters` 支持每个参数名前可选的 `const`，建 `ConstKeyword`
  作为 `TypeParameter` 的第一个 child（`<const T>` → TypeParameter[ConstKeyword, Identifier]）。
- **泛型类表达式（TS 5.0）**：`ParseClassExpression` 在 `class` 之后可选 `<...>`，TypeParameter 排在名字之前，
  heritage 起点与类体扫描从 `>` 之后开始。
- **泛型对象字面量方法（TS 5.0）**：`ParseObjectLiteral` 方法分支在名字之后可选 `<...>`，TypeParameter 排在
  名字之后、参数之前（`({ m<T>(x: T): T {...} })`）。

### AST 口径（TS 实测）

| 构造 | TS children |
| --- | --- |
| `f<string>` | `ExpressionWithTypeArguments` → `Identifier f`、`StringKeyword` |
| `a.b<T>` | `ExpressionWithTypeArguments` → `PropertyAccessExpression`、`TypeReference T` |
| `new C<number>` | `NewExpression` → `Identifier C`、`NumberKeyword`（无实参列表） |
| `<const T>(x: T) => x` | `ArrowFunction` → `TypeParameter`（`ConstKeyword` + `Identifier T`）、`Parameter`、`=>`、body |
| `class<T> {}` | `ClassExpression` → `TypeParameter`（在名字之前） |
| `({ m<T>(x: T): T {...} })` | `MethodDeclaration` → `Identifier m`、`TypeParameter`、`Parameter`、返回类型、`Block` |

### 读数

```
expression        630 / 630      # 619 + 11（instantiation 形态 + const 箭头 + trivia）
class-expressions  22 / 22       # 17 + 5（class<T> / class<T, U> / trivia）
members           187 / 187      # 181 + 6（对象泛型方法 / const / async / generator）
全量             3663 / 3663     # 3641 + 22；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓（注释目标 + 原因）

- 顶层逗号的形态（`const m = f<string, number>;`、`const cf2 = <const T, U>(...) => ...;`、`const D = class<T, U> {...};`）
  在 declarations / statements 的声明切分处会先按 `,` 断开（不属于 expressions 家族），因此语料里改用
  括号 / 表达式语句形态（`(f<string, number>)`、`(<const T, U>(...) => ...)`、`(class<T, U> {...})`）；行为本身已支持。
- `<const T, U extends A>` / `class<T extends A>`：`ParseAngleTypeParameters` 只收名字（extends/默认值留给 types 家族）；
- `f<string> + 1` 在 TS 里是**比较链**而不是 instantiation，故不按 instantiation 收（既有比较语料覆盖）。
## chunk 17（cover-fnexpr-decorators-1）：函数表达式参数装饰器 / 表达式类型参数约束与默认值

### 实现落点（只改 expression-builder）

- **函数表达式参数装饰器**：`ParseFunctionParameters` 在每个参数起点先探测 `@`，有则用
  `TypeBuilder.ParseDecorators()`（复用 `DecoratorShape`，不复制语义）读装饰器，再照旧读 `...` / 名字 / `?` / 类型 / 默认值。
  `Parameter` children 顺序与 TS 一致：Decorator(s) → DotDotDotToken? → Identifier/pattern → QuestionToken? → Type → initializer。
- **类型参数约束 / 默认值**：`ParseAngleTypeParameters` 不再自己按名字手搓，改为把 `<...>` 单元交给
  `TypeBuilder.ParseTypeParameterList()`（types 家族已有的完整 `[in][out][const] 名字 [extends 约束] [= 默认值]` 逻辑）。
  箭头、class 表达式、对象字面量方法三处因此一次性获得 `extends` / `= 默认` / `const ... extends`。

### AST 口径（TS 实测）

| 构造 | TypeParameter children |
| --- | --- |
| `<T extends A>` | Identifier T、TypeReference A |
| `<T = A>` | Identifier T、TypeReference A（默认值） |
| `<const T extends A>` | ConstKeyword、Identifier T、TypeReference A |
| `<T extends A, U = B>` | 两个 TypeParameter，各自带约束/默认 |
| `(function (@dec x: A) {})` | Parameter → Decorator、Identifier x、TypeReference A |

### 读数

```
expression        638 / 638      # 630 + 8（参数装饰器 4 + 箭头约束/默认 4）
class-expressions  26 / 26       # 22 + 4（class<T extends A> / class<T = A> / 组合 + trivia）
members           191 / 191      # 187 + 4（对象方法约束 / 默认 / const / 组合）
全量             3768 / 3768     # 3752 + 16；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓（注释目标 + 原因）

- 顶层逗号形态（`const fcb = <T extends A, U = B>(...) => ...;`）受 declarations/statements 的声明切分限制，
  语料改用括号形态 `(<T extends A, U = B>(...) => ...)`；行为本身已支持。
- 箭头参数装饰器（`<T>(@dec x: T) => x`）TS 解析可接受与否未收；类成员装饰器仍归 class 家族。
## chunk 18（cover-chain-sweep-1）：链式 / super / optional / this / tagged（measurement-first）

**未改 builder**：20 条候选先 append 再对拍，全部一次转绿（既有产生式组合已覆盖），因此 expression-builder 一行未改。

### 新增（全绿，base 40）

- optional chain 深链：`a?.b.c`、`a?.b?.[c]?.(d)`、`(a?.b)!`
- 调用 / 索引链：`a.b().c().d`、`a().b().c`
- `super` 组合：方法体内 `super.m(); super.x; super["y"];`、构造函数 `super()`、`super.m?.()`
- `this` 链：`this.x.y`、`this["x"]`、`this.m()`、`this.#p`（class 内 `#p` 字段 + 读取）
- tagged template：`a`x``、`a.b`x``、`a?.b`x``
- trivia：`a?. /* c */ b.c`、`a.b /* c */ ().c()`、`this. /* c */ x.y`、`a /* c */ `x``

### 读数

```
expression  658 / 658      # 638 + 20
全量       3882 / 3882     # 3862 + 20；结构差 0 / 位置差 0 / 字段差 0
```

### 红→绿清单

无：全部候选形态测量前已支持。

### 暂缓（注释目标 + 原因）

- `a?.b = c`：TS 语法层可解析，但语义禁止（optional chain 不能作赋值目标），不入 AST 对拍语料；
- `this.#x` / `a.#x` 已在 base 35 覆盖，本块只补 `this.#p` 与 class 内读取组合。