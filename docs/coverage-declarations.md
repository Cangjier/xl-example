# declarations 覆盖报告（chunk 1）

分支 `cover-declarations-1`，起点 `origin/integration @ee750929`（含 expressions / members / end / types chunk 1）。
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
