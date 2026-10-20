// declarations 用例集：class / interface / enum / function 声明。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行；注释必须独立成行。
// 对拍口径：TS 侧 ts.createSourceFile 的 AST；本仓侧 SourceFileRunner.Parse 的形状树。
// 快照：node typescript/cases/ast-json.mjs declarations && node typescript/cases/ast-json-diff.mjs declarations
//
// 覆盖范围：
//   D1 ClassDeclaration 空类体：名字、declare / abstract 修饰符；区间 / 名字与修饰符 Pos 与 TS 一致；
//   D2 InterfaceDeclaration 空接口体：名字、declare 修饰符；
//   D3 EnumDeclaration：空枚举、1~3 个成员、数字 / 字符串 / 二元初始化器、尾随逗号；
//   D4 FunctionDeclaration：空体 / 无类型参数 / 带类型参数 / 可选参数 / 返回类型 / 体内 return；
//   D5 heritage：class/interface 的 extends、class 的 implements、单/多个父类型、泛型实参（1~2 个）；
//   D6 trivia：前导注释、关键字与名字之间、名字与括号之间、参数间、heritage 各位置、体前注释、块内、多行；
//   D7 同一文件多条声明（重复形，含不同声明混排）。
//
// 暂缓（不写进本用例集；原因见 docs/coverage-declarations.md）：
//   类成员                   class C { a = 1; }      <- 需要 types 家族的 class element shapes
//   接口成员                 interface I { a: A }    <- 同上
//   泛型声明                 class C<T> {}   function f<T>() {}   <- TypeParameterShape（types 家族）
//   限定名父类型             class C extends a.B {} <- ExpressionWithTypeArguments 里接 PropertyAccess / QualifiedName
//   装饰器 / 重载 / declare function f(): void;        <- 各自家族 / 声明 end 候选
//   枚举成员是 computed 名    enum E { [k] = 1 }      <- 需要 ComputedPropertyName
//   类型别名                 type T = number;         <- 已有 types.ts，不重复造
//   体前换行                 class C\n{ }   function f()\n{ }   <- 根终结候选的 ASI 判据把换行后的 `{`
//                               当成上一条表达式结束（cover-end-1 的范围）；块内换行已绿。

// ===== base 1：ClassDeclaration（空类体）=====
class C {}
class A {}
class ABC {}
class C1 {}
// + declare 修饰符
declare class C {}
declare class D {}
// + abstract 修饰符（TS kind 反查是 FirstContextualKeyword，harness 别名归一到 AbstractKeyword）
abstract class C {}
abstract class D {}
abstract class ABC {}
declare abstract class C {}
abstract declare class C {}
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
/* c */ abstract class C {}
abstract /* c */ class C {}
abstract class /* c */ C {}
abstract class C { /* c */ }

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

// ===== base 4：FunctionDeclaration =====
function f() {}
function g() {}
function f(a) {}
function f(a, b) {}
function f(a, b, c) {}
function f(a: A) {}
function f(a: A, b: B) {}
function f(): void {}
function f(a?: A) {}
function f(a: A): C {}
function f(a: A, b: B): C { return a; }
function f() { return; }
function f(a) { return a; }
function f(a: A) { return a; }
function f(a: A, b: B): C { let x = a; return x; }
// + trivia
/* c */ function f() {}
function /* c */ f() {}
function f /* c */ () {}
function f(/* c */ a) {}
function f(a /* c */) {}
function f(a: A /* c */) {}
function f(a /* c */ : A) {}
function f(a: /* c */ A) {}
function f() /* c */ {}
function f() { /* c */ }
function f() { /* c */ return; }
function\nf() {}
function f() {}\n
// + 与其它声明混排（重复形）
function f() {} function g() {}
function f() {}\nfunction g() {}
function f() {} class C {}
class C {} function f() {}
function f() {} interface I {}
interface I {} function f() {}
function f() {} enum E { A }

// ===== base 5：heritage（extends / implements / 泛型实参）=====
class C extends D {}
class C extends D<E> {}
class C extends D<E, F> {}
class C implements I {}
class C implements I, J {}
class C extends D implements I {}
class C extends D<E> implements I<J>, K {}
interface I extends J {}
interface I extends J, K {}
interface I extends J<K> {}
interface I extends J<K, L> {}
abstract class C extends D implements I {}
abstract class C extends D<E> implements I {}
// + trivia
/* c */ class C extends D {}
class C /* c */ extends D {}
class C extends /* c */ D {}
class C extends D /* c */ {}
class C /* c */ implements I {}
class C implements /* c */ I {}
class C extends D<E /* c */> {}
class C extends D < E > {}
class C extends D<E,\nF> {}
interface I /* c */ extends J {}
interface I extends /* c */ J {}
interface I extends J /* c */, K {}
interface I extends J<K /* c */> {}
// + 与其它声明混排（重复形）
class C extends D {} class E extends F {}
class C extends D {} interface I extends J {}
interface I extends J {} class C extends D {}
class C extends D implements I {} enum E { A }

// ===== base 6：同一文件多条声明（重复形 / 混排）=====
class C {} class D {}
class C {}\nclass D {}
interface I {} interface J {}
enum E {} enum F {}
enum E { A } enum F { B }
class C {} interface I {}
interface I {} enum E {}
enum E { A } class C {}
class C {}\ninterface I {}\nenum E { A }\n

// ===== base 6：无函数体声明（declare function / 重载签名）=====
declare function f(): void;
declare function f(a: A): B;
declare function f();
function f(a: A): B;
function f(): void;
// + 重载签名 + implementation
function f(a: A): B; function f(a: A): B { return a; }
function f(a: A): A; function f(a: B): B; function f(a): C; function f(a: any): any { return a; }
function f(a: A): B;\nfunction f(a: A): B { return a; }
// + trivia（返回类型与 ; 之间注释 / 换行、declare 与 function 之间）
/* c */ declare function f(): void;
declare /* c */ function f(): void;
declare function /* c */ f(): void;
declare function f(): /* c */ void;
declare function f(): void /* c */ ;
function f(): void /* c */ ;
function f(a: A):\nB;
declare function f(): void; // tail
declare\nfunction f(): void;
// + 同一文件多条声明（重复形）
declare function f(): void;\ndeclare function g(a: A): B;
declare function f(): void; function f(): void;
declare function\nf(): void;
