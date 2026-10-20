// declarations 用例集：class / interface / enum 声明（chunk 1 只收空类体 / 空接口体 / 枚举成员）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行；注释必须独立成行。
// 对拍口径：TS 侧 ts.createSourceFile 的 AST；本仓侧 SourceFileRunner.Parse 的形状树。
// 快照：node typescript/cases/ast-json.mjs declarations && node typescript/cases/ast-json-diff.mjs declarations
//
// 覆盖范围：
//   D1 ClassDeclaration 空类体：名字、`declare` 修饰符；区间 / 名字 Pos / 修饰符 Pos 与 TS 一致；
//   D2 InterfaceDeclaration 空接口体：名字、`declare` 修饰符；
//   D3 EnumDeclaration：空枚举、1~3 个成员、数字 / 字符串 / 二元 / 一元初始化器、尾随逗号；
//   D4 trivia：前导注释、关键字与名字之间、名字与 `{` 之间、`{` 之后、成员之间、初始化器等号后、多行；
//   D5 同一文件多条声明（重复形，含不同声明混排）。
//
// 暂缓（不写进本用例集；原因见 docs/coverage-declarations.md）：
//   函数声明                 function f() {}          <- 需要 statements 家族的 BlockShape
//   类成员                   class C { a = 1; }      <- 需要 types 家族的 class element shapes（types-2）
//   接口成员                 interface I { a: A }    <- 同上
//   接口继承                 interface I extends J {}<- 需要 HeritageClauseShape + ExpressionWithTypeArguments
//   abstract 修饰符          abstract class C {}     <- TS 把 abstract 印成 FirstContextualKeyword（别名口径），
//                                                        要 ast-json.mjs + diff 的 TS_KIND_ALIASES 加一条别名（harness 不在本块范围）
//   泛型 / 继承 / implements  class C<T> extends B {}<- 需要 TypeParameter / HeritageClause
//   装饰器 / 重载 / declare module                     <- 各自家族，后续 chunk
//   枚举成员是 computed   名  enum E { [k] = 1 }      <- 需要 ComputedPropertyName
//   类型别名                 type T = number;         <- 已有 types.ts（types chunk 1 合并），不重复造
//   体前换行（本块唯一没绿的 trivia 变体）
//                            class C\n{ }   interface I\n{ }   enum E\n{ A }
//                            <- 根终结候选按 IsAsiBoundary 把「换行后的 `{`」当成上一条表达式到此结束，
//                               与声明候选同时 Accept 触发 CatalogGuide 的歧义抛错。修点在
//                               files/source-file-end-possible-shape 或 IsAsiBoundary 的「声明开头不算表达式」判据
//                               （cover-end-1 的范围）；`class\nC {}`、块内换行等其余 trivia 变体已绿。

// ===== base 1：ClassDeclaration（空类体）=====
class C {}
class A {}
class ABC {}
class C1 {}
// + declare 修饰符
declare class C {}
declare class D {}
// + trivia
/* c */ class C {}
class /* c */ C {}
class C /* c */ {}
class C { /* c */ }
class\nC {}
class C {}\n
class C {}\ninterface I {}
/* c */ declare class C {}
declare /* c */ class C {}
declare class /* c */ C {}
declare class C { /* c */ }

// ===== base 2：InterfaceDeclaration（空接口体）=====
interface I {}
interface A {}
interface ABC {}
// + declare 修饰符
declare interface I {}
// + trivia
/* c */ interface I {}
interface /* c */ I {}
interface I /* c */ {}
interface I { /* c */ }
interface I {}\ninterface J {}
/* c */ declare interface I {}
declare interface I { /* c */ }

// ===== base 3：EnumDeclaration =====
enum E {}
enum E { A }
enum E { A, B }
enum E { A, B, C }
enum E { A = 1 }
enum E { A = 1, B = 2 }
enum E { A = 0, B = 1, C = 2 }
enum E { A = "x" }
enum E { A = "x", B = "y" }
enum E { A = 1 + 2 }
enum E { A = 1, }
enum E { A = "x", }
// + declare 修饰符
declare enum E {}
declare enum E { A }
declare enum E { A = 1 }
// + trivia
/* c */ enum E {}
enum /* c */ E {}
enum E /* c */ {}
enum E { /* c */ A }
enum E { A /* c */ }
enum E { A, /* c */ B }
enum E { A = /* c */ 1 }
enum E { A = 1, /* c */ B = 2 }
enum\nE {}
enum E {\nA\n}
enum E {\nA,\nB\n}
enum E { A = 1 /* c */ }

// ===== base 4：同一文件多条声明（重复形 / 混排）=====
class C {} class D {}
class C {}\nclass D {}
interface I {} interface J {}
enum E {} enum F {}
enum E { A } enum F { B }
class C {} interface I {}
interface I {} enum E {}
enum E { A } class C {}
class C {}\ninterface I {}\nenum E { A }\n
