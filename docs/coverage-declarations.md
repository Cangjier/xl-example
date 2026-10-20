# declarations 覆盖报告（chunk 1 + chunk 2 + chunk 3）

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
