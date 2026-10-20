# declarations 覆盖报告（chunk 1 + chunk 2 + chunk 3）

> **async chunk**（分支 `cover-async-fn-1`，起点 `origin/integration @9f7be57b`）：
> 新 stem `typescript/cases/async-functions.ts` **22 / 22** 完全一致；全量 **2503 → 2525** 全绿；tsc 0 error。
>
> Oracle（TS `createSourceFile`，实测）：`FunctionDeclaration` 的 children 顺序是
> **`AsyncKeyword` →（生成器 `AsteriskToken`）→ `Identifier` → 参数 →（可选）返回类型 →（可选）`Block`**；
> `AsyncKeyword` 区间就是 `async` token（`Pos` = 前一个非 trivia 单元 `End+1`），声明 `Pos` 仍从 `async` 起。
> `declare async function` 的 children 顺序是书写顺序 `DeclareKeyword → AsyncKeyword → …`。
>
> 实现（两页，均在 function declaration 家族内）：
> - `function-declaration-possible-shape.xl.md`：Stage 0 接受 `declare` / `async`（`HasDeclare` / `HasAsync`），
>   Stage 6 = 见过修饰词等 `function`；`declare async function` 的第二个修饰词在 Stage 6 接受。
>   修饰词与 `function` 之间**换行**时沿用既有 `NoNewlineBefore`/`SplitDeclare` 机制，按 TS 的 ASI
>   一次建出「ExpressionStatement(修饰词) + FunctionDeclaration」两条形状。
> - `function-declaration-shape.xl.md`：`FromUnits` 改成**修饰词循环**（`declare` / `async`，按书写顺序），
>   逐个建 `DeclareKeywordShape` / `AsyncKeywordShape`（`AsyncKeywordShape` 只有构造函数，这里就地签区间/Pos 后 `TryToClose`），
>   Data 顺序 = 修饰词 →（`*`）→ 名字 → 参数 → 返回类型 → 函数体；`Pos` 链 = 第一个修饰词取声明 Pos、后续取前一个修饰词 `End+1`。
>   `await` 表达式由既有 `ExpressionBuilder` 处理，未改。
>
> 22 条覆盖：`async function f() {}`、带参数/返回类型、`await g();` 体、`return await g();`、两种 await 混排、
> `declare async function f(): void;`、注释（前导 / async 与 function 间 / function 与名字间 / 参数内 / 返回类型前后）、
> `async function\nf() {}`、`async\nfunction f() {}`（ASI 拆分，TS 语义即 ExpressionStatement(async) + FunctionDeclaration）、
> 重复形与和 `function` / `let` / `declare` 混排。
>
> **nested async chunk**（分支 `cover-nested-async-1`，起点 `origin/integration @895a4ba5`）：
> 把上面「暂缓：嵌套 async function」收掉。`async-functions.ts` **22 → 43**（+21），**43/43** 完全一致；
> 全量 **2653 → 2674** 全绿；tsc 0 error。
>
> 实测还发现：修复前同步嵌套 `function f() { function g() {} }` 被建成了 **ExpressionStatement(FunctionExpression)**，
> 与 TS 的 FunctionDeclaration 结构不符（只是没有 stem 测到它）；本次分派修复后它也一并转绿。
>
> 修法（`typescript/tokens/statements/statement-builder.xl.md`，唯一源改动）：
> - `BuildStatement` 的 Common 分派新增 `function` 与 `async`+`function` 对 → `BuildFunctionDeclaration`；
> - `BuildFunctionDeclaration` 找声明结尾（体 `{…}` 括号或重载签名 `;`），用 **host-like 适配器**
>   `{ Data: this.Units, Template: this.Template }` 调 `FunctionDeclarationShape.FromUnits`（该函数只读
>   `host.Data` / `host.Template`，所以体外嵌套声明也能复用同一套构造，不重复归属）；
> - 适配器不知道「块内第一条语句的 base offset」，所以事后把 shape 的 `Pos` 与**第一个修饰词**
>   （`AsyncKeyword`/`DeclareKeyword`）的 `Pos` 用本 builder 的 `Positions[first]` 修正。
>
> 21 条新增：体内嵌套 async（空体 / await 体 / `return g;` / 带返回类型 / 带参数 / 重载签名 `async function g(a: A): B;`）、
> 三层嵌套、async 里套同步 function、同步 function 里套 async、`{ async function f() {} }`、
> `if (a) { async function f() {} }`、`while (a) { async function f() {} }`、块内 async + `let`、
> async/function 之间的注释、以及 class 方法体里的嵌套 async function（`class C { m() { async function f() {} } }`、
> async 方法体两种）；同步嵌套 `function f() { function g() {} }` 回归也计入。
>
> 仍未做：module / namespace **块体**里的嵌套 async function（块体由 module-block builder 负责，本块不改 module 文件，
> 故未测试）；async generator（`async function*`）、async method（class extras）、泛型 async function（types 家族）、
> `export async function`（export 侧）。
>
> **chunk 3（heritage）**（分支 `cover-declarations-3`，起点 `origin/integration @0a02bda2`，合并
> `origin/cover-declarations-2 @b8499967`；`source-file-shape.xl.md` 候选表有冲突，按并集手工去重后提交）：
> ast-json 全量 **1554 / 1554**（合并后基线 1524 零回归），declarations.ts **138 / 138**，tsc 0 error，xl_build 0 error。
>
> chunk 3 新增（30 条，全部完全一致）：
> - `class C extends D {}`、`extends D<E>`、`extends D<E, F>`；
> - `class C implements I {}`、`implements I, J`、`extends D implements I`、`extends D<E> implements I<J>, K`；
> - `interface I extends J {}`、`extends J, K`、`extends J<K>`、`extends J<K, L>`；
> - `abstract class C extends D implements I {}`、`abstract class C extends D<E> implements I {}`；
> - trivia：前导注释、类名后、`extends`/`implements` 后、类型名后、泛型实参内注释、`D < E >` 带空格、实参换行、
>   heritage 与其它声明混排（`class … {} class … {}` / `interface … {} class … {}` / `enum`）。
>
> 实现（三页）：
> - `members/heritage-clause-shape.xl.md`：`HeritageClauseShape`（`ClauseKind` / `Types`，Data 只有
>   `ExpressionWithTypeArguments`，关键字不进 Data）+ `BuildClauses(host, units, basePos, context)`：
>   用 `TypeBuilder` 逐个解析 `名字 [<类型实参>]`，`extends`/`implements` 关键字切子句；
> - `expressions/expression-with-type-arguments-shape.xl.md`：`FromParts(name, typeArguments, endToken, pos, context)`，
>   区间从名字起点到 `>`（`endToken` = 最后一个 `>`，没有实参就是名字），类型实参用
>   `TypeBuilder.ParseTypeArguments()`；
> - `class/interface-declaration-{shape,possible-shape}`：名字之后、体之前识别 heritage 单元（Common/Symbol），
>   `FromUnits` 调 `HeritageClauseShape.BuildClauses` 并把子句按顺序 Add；Pos = 名字终点 + 1。
> 踩坑记录：候选里 `unit instanceof Symbol` 必须 import 了 `symbol.xl.md`（漏 import 时生成物引用全局 `Symbol`，
> 会静默全部 Reject，进而被根终结候选当成 ASI 边界去建表达式语句）。
>
> chunk 3 仍未做：限定名父类型（`extends a.B`，需要 QualifiedName/PropertyAccess 接入）、class/interface 带成员
> （class element shapes）、`export default class`、装饰器、泛型声明、体前换行（根终结候选 ASI 判据，cover-end-1 范围）。
# declarations 覆盖报告（chunk 1 + chunk 2 + chunk 4）

> **chunk 4**（分支 `cover-declarations-4`，起点 `origin/integration @2ceafb28`，含 declarations-2 的函数声明）：
> declarations.ts **128 / 128**，全量 **1661 / 1661**（基线 1641 零回归），tsc 0 error，xl_check 0 error。
>
> chunk 4 新增（20 条）：**无函数体声明**——`declare function f(): void;`、`declare function f(a: A): B;`、
> `declare function f();`、重载签名 `function f(a: A): B;` / `function f(): void;`、2 个重载 + implementation、
> 3 个重载 + implementation（`function f(a: A): A; … function f(a: any): any { return a; }`）、同文件多条；
> trivia：返回类型与 `;` 之间的注释 / 换行、`declare` 与 `function` 之间注释、`declare function f(): /* c */ void;`、
> 尾注释、`declare\nfunction f(): void;`（TS 按 ASI 拆成 ExpressionStatement + FunctionDeclaration）。
>
> 实现：
> - `FunctionDeclarationPossibleShape`：Stage 机扩展——0 等 `declare`/`function`，6 见过 `declare` 等 `function`，
>   3 参数表之后可接受 `;`（仅 `declare` 形），4 返回类型之后可接受 `{` 或 `;`；`DoneAt` 记函数体 `Bracket` 或 `;`。
>   仍是**原子建法**：在 `;` / 函数体那一格 `BuildByIndex` 一次建完整条，不新增 end 候选、不用 `ExitOrPre`、
>   不覆盖 `ComputePossibleShapes`（IMPORTANCE §3.3）。
> - `declare` 与 `function` 之间**换行**时 TS 走 ASI：`declare` 是独立 ExpressionStatement，`function` 另起声明。
>   候选用 `NoNewlineBefore` 判这一格；`SplitDeclare` 为真时 `BuildByIndex` 一次往 `host.Data` 里放两条形状
>   （ExpressionStatement(declare) + FunctionDeclaration），区间 / Pos 与 TS 对齐（`FunctionDeclaration.Pos` = `declare.End+1`）。
> - `FunctionDeclarationShape.FromUnits`：Data 顺序变成「可选 DeclareKeyword → 名字 → 参数 → 可选返回类型 → 可选 Block」；
>   无体时最后一块是 `;`（AST 的 End 含分号），`Data` 里没有 Block；`function f();` 仍被拒（无 `declare` 且无返回类型）。
>
> chunk 4 暂缓：`export declare function`（export 前缀归 cover-export-decls-2）、泛型函数声明、装饰器、
> `declare const`；`declare` 独立成句（`declare\nfunction` 已按 TS 的 ASI 拆分建出，靠的是候选侧的拆分建法，
> 不依赖 expression 候选放开 `declare`）。
>
> chunk 4 新增 trivia 用例里值得一提的是 `declare function\nf(): void;`（换行在 `function` 与名字之间）：
> TS 仍算同一 FunctionDeclaration；本实现也是同一候选扫描，已绿。

> **chunk 2**（分支 `cover-declarations-2`，起点 `origin/integration @89413f7d`，已合并
> `origin/cover-expressions-3 @8e09dbf4` 与 `origin/cover-declarations-1 @f0040127`）：
> ast-json 全量 **1383 / 1383**（基线 1339 零回归），declarations.ts **108 / 108**，tsc 0 error，xl_check 0 error。
>
> chunk 2 新增（44 条）：
> - **FunctionDeclaration**：`function f() {}`、`function f(a) {}`、`function f(a, b) {}`、`function f(a: A) {}`、
>   `function f(a: A, b: B) {}`、`function f(): void {}`、`function f(a?: A) {}`、`function f(a: A): C {}`、
>   `function f(a: A, b: B): C { return a; }`、`function f() { return; }`、`function f(a) { return a; }`、
>   体内 `let` + `return`、以及与 class/interface/enum 混排的重复形；trivia：前导、关键字与名字间、
>   名字与括号间、参数前后/冒号前后注释、体前注释、块内、`function\nf()`、行尾换行。
>   实现：`FunctionDeclarationShape.FromUnits` 自建参数（不带类型的只建 Identifier，带 `:`/`?:` 的走
>   `TypeBuilder.ParseParameter()`）、`TypeBuilder.ParseType()` 建返回类型、`StatementBuilder` 建 `{…}` 函数体；
>   `FunctionDeclarationPossibleShape` 用 Stage 扫描，Accept 落在函数体那个 `Bracket` 上。
> - **abstract 修饰符**：`abstract class C {}`、`declare abstract class C {}`、`abstract declare class C {}` +
>   trivia。新增 `keywords/abstract-keyword-shape.xl.md`（`FromBasicToken`）；`class-declaration-shape` 支持
>   任意顺序的 `declare` / `abstract` 修饰符（第一个修饰符 Pos = 声明 Pos，后续 = 前一个修饰符 End+1）。
> - **harness 别名**（最小改动）：`ast-json.mjs` 与 `ast-json-diff.mjs` 的 `TS_KIND_ALIASES` 各加一行
>   `["FirstContextualKeyword","AbstractKeyword"]`（带注释）。全量复跑其它 stem 无回归。
>
> chunk 2 仍未做：继承 / implements（`HeritageClause` 在 members 家族、`ExpressionWithTypeArguments` 在
> expressions 家族，都不在本块 write scope）；class/interface 带成员（等 class element shapes）；
> `function f()\n{ }` 体前换行（同一个根终结候选 ASI 判据，cover-end-1 范围）；泛型 / 装饰器 / 重载 /
> `declare function f(): void;`（声明 end 候选）。

分支 chunk 1：`cover-declarations-1`，起点 `origin/integration @ee750929`（含 expressions / members / end / types chunk 1）。
本块动了：`typescript/tokens/declarations/{class,interface,enum}-declaration-{shape,possible-shape}.xl.md`、
`typescript/tokens/files/source-file-shape.xl.md`（只取消注释自己的 3 行候选）、
`typescript/cases/declarations.ts`。没有碰 import-equals / export-assignment / namespace-export 的任何文件与候选行。

## 读数

| 指标 | integration 基线 | 本块之后 |
| --- | --- | --- |
| ast-json 全量 | 1097 / 1097 | **1161 / 1161**（12 个构造） |
| declarations.ts | — | 64 / 64 完全一致 |
| diff | 全一致 | 1161 全一致，结构差 / 位置差 / 字段差均 0 |
| tsc | 0 error | 0 error |
| xl_check（declarations + files） | — | 0 error |
| 其它 stem | 全绿 | 全绿（end 53、export 62、expression 288、import 54、literals 70、members 76、number 70、regex 256、string 75、types 93、bindings 0） |

## 已测量（绿色，base + trivia + 重复形）

1. **ClassDeclaration 空类体**：`class C {}`（标识符名、区间 / 名字 Pos 与 TS 一致）、
   `declare class C {}`（修饰符子节点 DeclareKeyword，pos 含前导 trivia）；
   注释：前导、`class` 与名字之间、名字与 `{` 之间、`{` 之后、行尾、块内、`class\nC {}`、文件尾换行。
2. **InterfaceDeclaration 空接口体**：`interface I {}`、`declare interface I {}` + 同类 trivia。
3. **EnumDeclaration**：`enum E {}`、`enum E { A }`、`{ A, B }`、`{ A, B, C }`、`{ A = 1, B = 2 }`、
   `{ A = "x" }`、`{ A = 1 + 2 }`、尾随逗号；`declare enum E {}` / `{ A }` / `{ A = 1 }`；
   注释（成员前 / 成员间 / `=` 后 / 成员尾）、块内多行。
4. **同一文件多条声明**（重复形 / 混排）：`class C {} class D {}`、`enum E { A } enum F { B }`、
   `class C {} interface I {}`、`class C {}\ninterface I {}\nenum E { A }` 等。

## 实现要点

- `ClassDeclarationPossibleShape` / `InterfaceDeclarationPossibleShape` / `EnumDeclarationPossibleShape` 都是
  根候选：用 `PossibleShapeCache` 记「已经扫到哪 + Stage」（0 等 `declare`/关键字、1 等关键字、2 等名字、3 等体、
  4 完整），Accept 落在体那个 `Bracket` 上，`IsBuildable` 只在体那一格为真，`BuildByIndex` 把
  `host.Data[start..tokenIndex]` 换成声明形状（`ItemUtil.ItemStart` 取条目起点）。
- 类 / 接口体在本批**只收空体**：候选见到非空体主动 `Reject`（成员未实现），宁可「没有候选」炸出来，也不静默丢成员。
- 枚举成员由 `EnumDeclarationShape` 在枚举体 `Bracket.Data` 上按顶层逗号切组后**就地建 `EnumMemberShape`**
  （members 家族的构造函数已就绪；本块没有改 members/**）：名字 / 成员 Pos = 前一个单元（`{` 或 `,`）`End.Index+1`，
  初始化器用 `ExpressionBuilder.ParseAssign()` 解析，成员区间到初始化器终点。
- 形状字段名用 `NameToken` / `EnumName` / `Members` 而不是 `Name`：`cjAst` 会把 `Name` 投影成 AST 的 `name`，会假报字段差。

## 未完成 / 暂缓（含依赖）

| 目标 | 依赖 |
| --- | --- |
| `function f() {}` 函数声明 | statements 家族的 `BlockShape`（还没合并） |
| `class C { a = 1; }` / `interface I { a: A }` 成员 | types 家族的 class element shapes（types-2 进行中） |
| `interface I extends J {}` / `class C extends B {}` | `HeritageClauseShape` + `ExpressionWithTypeArguments`（hers 两页仍是占位） |
| `class C<T> {}` 泛型 | `TypeParameterShape`（types 家族） |
| `abstract class C {}` | **harness 别名**：TS 把 `abstract` 印成 `FirstContextualKeyword`，需要在
  `typescript/cases/ast-json.mjs` 与 `ast-json-diff.mjs` 的 `TS_KIND_ALIASES` 加 `["FirstContextualKeyword","AbstractKeyword"]`
  （两个 harness 文件不在本块 write scope；`keywords/abstract-keyword-shape.xl.md` 仍是 19 行骨架，别名到位后可以顺手实现）。 |
| 体前换行 `class C\n{}` / `interface I\n{}` / `enum E\n{}` | **根终结候选的 ASI 判据**：`IsAsiBoundary` 把「换行后到来的 `{`」
  当成「上一条表达式到此结束」（上一代码单元 `C` 满足 `CanEndExpression`），于是终结候选与声明候选同时 Accept，
  `CatalogGuide` 按契约抛「终结候选与其它候选同时成立」。修点在 `files/source-file-end-possible-shape` 或
  `ExpressionStatementPossibleShape.IsAsiBoundary` 加「条目以声明关键字开头时不算 ASI 边界」的判据（cover-end-1 的范围）。
  `class\nC {}`、块内换行等其余 trivia 变体已经绿。 |
| 枚举 computed 成员名 `enum E { [k] = 1 }` | `ComputedPropertyNameShape`（types 家族） |
| `declare module "m" {}` / namespace 块 | statements 的 `BlockShape` + module-block 形状 |
| 装饰器 / 重载 / export 前缀 | 各自家族，后续 chunk |
| `type T = number;` 类型别名 | 已有 `types.ts`（types chunk 1 合并），不重复造、不改 |

## 下一块建议

1. **end 家族补 ASI 判据**（`IsAsiBoundary` 对声明条目直接返回 false）后，本块所有「体前换行」变体可一键转绿，
   顺带让 function / module 等声明不再撞同一个坑。
2. **types-2** 落地 class element / interface member 形状后，class/interface 的非空体即可接入（候选里的
   `Reject` 改成构造成员）。
3. **statements 的 BlockShape** 落地后接函数声明与 namespace/module（`declare module` 的 body 是 module-block）。
4. 若 harness 允许补别名（`FirstContextualKeyword`），把 `abstract` 修饰符补上；同类还有 `AccessorKeyword` 等上下文关键字。

## generators：function* 声明（cover-generators-1）

分支 `cover-generators-1`，基线 `origin/integration @1a241388`。本块改
`declarations/function-declaration-shape.xl.md` + `function-declaration-possible-shape.xl.md`
与 `expressions/expression-builder.xl.md`（yield），新增 `typescript/cases/generator-functions.ts`。

### 实现落点

- `FunctionDeclarationPossibleShape`：Stage 1（等名字）接受 `Symbol "*"` 并保持 Stage 1，`function*` 不再被 Reject。
- `FunctionDeclarationShape.FromUnits`：`function` 之后可有一颗 `*`（`nameOffset` / `afterParams` 随之 +1）；
  新增 `AsteriskToken` 字段，`AsteriskTokenShape` 插在 `DeclareKeyword?` 与名字之间（TS children 顺序）。
  名字 `Pos` 改为 `*` 之后；星号 `Pos` = `function` 之后（含 trivia）。
- 无体声明 / 返回类型 / 参数的既有逻辑不动。

### AST 口径（TS 实测）

| 构造 | TS children / 区间 |
| --- | --- |
| `function* f() {}` | `FunctionDeclaration[0,16)` → `AsteriskToken[8,9)`、`Identifier[9,11)`、`Block[13,16)` |
| `function* f(a: A): B { return a; }` | `AsteriskToken[8,9)`、`Identifier[9,11)`、`Parameter[12,16)`、`TypeReference[18,20)`、`Block[20,34)` |
| `function /* c */ * /* d */ f() {}` | `AsteriskToken[8,18)`（pos 含 trivia）、`Identifier[18,28)` |
| `function\n* f() {}` / `function *f() {}` | 星号与名字照常；`AsteriskToken[8,10)`、`Identifier[10,12)` |

### 读数

```
generator-functions  27 / 27      # function* 声明 9 + yield/yield* 14 + 优先级 3 + 暂缓目标 0
全量                2271 / 2271   # 23 个构造；结构差 0 / 位置差 0 / 字段差 0
```

### 暂缓（附原因）

- `async function* f() {}` ← async/await 家族；
- generator 表达式 / 方法（`(function* () {})`、`({ *m() {} })`）← function-expression / class element shapes；
- 顶层 `yield` ← TS 视为标识符/诊断，且 `CanStart` 不收 `yield`；
- `yield` 后换行（受限产生式，TS 拆成「yield 无操作数 + 下一句」）← 需 ASI/换行断句，本块未做。
