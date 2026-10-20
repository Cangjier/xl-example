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
