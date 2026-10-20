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
declare interface I {}
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
declare enum E {}
declare enum E { A }
declare enum E { A = 1 }
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
// declarations 鐢ㄤ緥闆嗭細class / interface / enum / function 澹版槑銆?// 涓€琛屼竴涓敤渚嬶紱琛屽唴 \n 鐢?ast-json.mjs 杩樺師鎴愮湡瀹炴崲琛岋紱娉ㄩ噴蹇呴』鐙珛鎴愯銆?// 瀵规媿鍙ｅ緞锛歍S 渚?ts.createSourceFile 鐨?AST锛涙湰浠撲晶 SourceFileRunner.Parse 鐨勫舰鐘舵爲銆?// 蹇収锛歯ode typescript/cases/ast-json.mjs declarations && node typescript/cases/ast-json-diff.mjs declarations
// 瑕嗙洊鑼冨洿锛?//   D1 ClassDeclaration 绌虹被浣擄細鍚嶅瓧銆乨eclare / abstract 淇グ绗︼紱鍖洪棿 / 鍚嶅瓧涓庝慨楗扮 Pos 涓?TS 涓€鑷达紱
//   D2 InterfaceDeclaration 绌烘帴鍙ｄ綋锛氬悕瀛椼€乨eclare 淇グ绗︼紱
//   D3 EnumDeclaration锛氱┖鏋氫妇銆?~3 涓垚鍛樸€佹暟瀛?/ 瀛楃涓?/ 浜屽厓鍒濆鍖栧櫒銆佸熬闅忛€楀彿锛?//   D4 FunctionDeclaration锛氱┖浣?/ 鏃犵被鍨嬪弬鏁?/ 甯︾被鍨嬪弬鏁?/ 鍙€夊弬鏁?/ 杩斿洖绫诲瀷 / 浣撳唴 return锛?//   D5 trivia锛氬墠瀵兼敞閲娿€佸叧閿瓧涓庡悕瀛椾箣闂淬€佸悕瀛椾笌鎷彿涔嬮棿銆佸弬鏁伴棿銆佷綋鍓嶆敞閲娿€佸潡鍐呫€佸琛岋紱
//   D6 鍚屼竴鏂囦欢澶氭潯澹版槑锛堥噸澶嶅舰锛屽惈涓嶅悓澹版槑娣锋帓锛夈€?//
// 鏆傜紦锛堜笉鍐欒繘鏈敤渚嬮泦锛涘師鍥犺 docs/coverage-declarations.md锛夛細
//   绫绘垚鍛?                  class C { a = 1; }      <- 闇€瑕?types 瀹舵棌鐨?class element shapes
//   鎺ュ彛鎴愬憳                 interface I { a: A }    <- 鍚屼笂
//   缁ф壙 / implements        class C extends D {}    interface I extends J {}   class C implements I {}
//                            <- HeritageClause / ExpressionWithTypeArguments 褰㈢姸鍦?members/ 涓?expressions/ 瀹舵棌锛?//                               涓嶅湪鏈潡 write scope
//   娉涘瀷澹版槑                 class C<T> {}   function f<T>() {}   <- TypeParameterShape锛坱ypes 瀹舵棌锛?//   瑁呴グ鍣?/ 閲嶈浇 / declare function f(): void;        <- 鍚勮嚜瀹舵棌 / 澹版槑 end 鍊欓€?//   鏋氫妇鎴愬憳鏄?computed 鍚?   enum E { [k] = 1 }      <- 闇€瑕?ComputedPropertyName
//   绫诲瀷鍒悕                 type T = number;         <- 宸叉湁 types.ts锛屼笉閲嶅閫?//   浣撳墠鎹㈣                 class C\n{ }   function f()\n{ }   <- 鏍圭粓缁撳€欓€夌殑 ASI 鍒ゆ嵁鎶婃崲琛屽悗鐨?`{`
//                               褰撴垚涓婁竴鏉¤〃杈惧紡缁撴潫锛坈over-end-1 鐨勮寖鍥达級锛涘潡鍐呮崲琛屽凡缁裤€?
// ===== base 1锛欳lassDeclaration锛堢┖绫讳綋锛?====
// + declare 淇グ绗?declare class C {}
// + abstract 淇グ绗︼紙TS kind 鍙嶆煡鏄?FirstContextualKeyword锛宧arness 鍒悕褰掍竴鍒?AbstractKeyword锛?abstract class C {}
// ===== base 2锛欼nterfaceDeclaration锛堢┖鎺ュ彛浣擄級=====
// + declare 淇グ绗?declare interface I {}
// ===== base 3锛欵numDeclaration =====
// + declare 淇グ绗?declare enum E {}
// ===== base 4锛欶unctionDeclaration =====
// + 涓庡叾瀹冨０鏄庢贩鎺掞紙閲嶅褰級
// ===== base 5锛氬悓涓€鏂囦欢澶氭潯澹版槑锛堥噸澶嶅舰 / 娣锋帓锛?====
// ===== base 7锛歝lass 鎴愬憳锛坈lass elements锛?====
class C { x = 1; }
class C { x: number = 1; }
class C { x; }
class C { x = a; }
class C { readonly x = 1; }
class C { static x = 1; }
class C { private x = 1; }
class C { public x; }
class C { protected x = 1; }
class C { x; y; }
class C { m() {} }
class C { m(a) {} }
class C { m(a: A) {} }
class C { m(a: A, b: B) {} }
class C { m(): C {} }
class C { m(a: A): B { return a; } }
class C { static m() {} }
class C { private m() {} }
class C { public m(a: A): B { return a; } }
class C { m() {} n() {} }
class C { constructor() {} }
class C { constructor(a: A) {} }
class C { constructor(a, b) {} }
class C { private constructor() {} }
class C { get x() { return 1; } }
class C { set x(v) {} }
class C { get x() { return 1; } set x(v) {} }
class C { static get x() { return 1; } }
class C { [k] = 1; }
class C { [k]() {} }
class C { x = 1; y = 2; m() {} }
class C { /* c */ x = 1; }
class C { x /* c */ = 1; }
class C { x = /* c */ 1; }
class C { x = 1 /* c */; }
class C { readonly /* c */ x = 1; }
class C {\nx = 1;\n}
class C {\n m(a: A): B {\n return a;\n }\n}
class C { x = 1; /* c */ y = 2; }
// ===== base 8锛歩nterface 鎴愬憳锛坱ype members锛?====
interface I { a: number; }
interface I { a?: number; }
interface I { readonly b: string; }
interface I { a?: number; readonly b: string; }
interface I { m(): void; }
interface I { m(a: A): B; }
interface I { [k: string]: A; }
interface I { a: number; b: A; }
interface I {\na: number;\nb: A;\n}
interface I { /* c */ a: number; }
interface I { a /* c */ : number; }
interface I { m(): void; n(): A; }
interface I { a: number; readonly b: A; m(): void; }
// ===== 鏆傜紦锛歝lass 琛ㄨ揪寮忓甫鎴愬憳锛堥渶瑕佹敼 expression-builder 鐨?ParseClassExpression锛屾湰鍧椾笉纰?expressions锛?====
// (class { x = 1; });
// (class { m() {} });

// ===== chunk M：声明修饰词（declare / export on type alias + export declare function）=====
// `declare` / `export` 现在由声明形状自己收（Data 最前是 ExportKeyword / DeclareKeyword 子节点）。
declare type T = A;
declare type T<U> = U;
declare type T = A | B;
declare type T<U extends A = B> = [U, B];
declare type T = A; // tail
declare /* c */ type T = A;
declare type /* c */ T = A;
declare type T = /* c */ A;
export type T = A;
export type T<U> = U;
// export + declare 两个修饰词的组合暂红：根候选在 EOF 共存（CatalogGuide「终结候选与其它候选同时成立」），
// 不是 type-alias / function 声明形状的问题（两个形状已能收 export+declare 修饰，见 FromUnits）。
// export declare type T = A;
// export declare type T<U> = U;
// export declare type T = A | B;
// export declare function f(): void;
// export declare function f(a: A): B;
export function g() {}
export function h(a: A): B { return a; }
// 对照（已绿，只记录、不重复）：declare class C {} / declare interface I {} / declare enum E { A } / declare function f(): void;
// 暂缓：declare const x: number; / declare let y: string; / declare var z = 1;  ← 属 statements / variable-declaration 家族
//       export declare interface I {}  ← interface 声明形状文件不在本块 write scope（export 侧同样需要它接受修饰词）

// 瑁呴グ鍣?/ static block / overloads / abstract 鏂规硶锛氬悗缁?chunk

// ===== base 9：class element extras（abstract / overload / static block）=====
abstract class C { abstract m(): void; }
abstract class C { abstract x: number; }
abstract class C { abstract m(): void; abstract x: A; }
abstract class C { abstract m(a: A): B; }
abstract class C { abstract x: A; y = 1; }
class C { m(a: A): B; m(a): any { return a; } }
class C { m(): void; m() {} }
class C { m(a: A): B; m(a: A): B; m(a): any { return a; } }
class C { m(): void; x = 1; }
class C { static { a(); } }
class C { static {} }
class C { x = 1; static { a(); } }
class C { static { a(); } m() {} }
// + trivia
abstract class C { /* c */ abstract m(): void; }
abstract class C { abstract /* c */ m(): void; }
abstract class C { abstract x: /* c */ A; }
class C { m(a: A): B; /* c */ m(a): any { return a; } }
class C { static { /* c */ a(); } }
class C { static { a(); } /* c */ }

// ===== 暂缓（base+trivia，待后续 chunk）=====
// 装饰器：需要 expression 家族以外再开「@ 表达式」分派（类 candidate Stage 0 + 成员前缀），本块未做
// @dec class C {}
// class C { @dec m() {} }
// class C { @dec x = 1; }
// private fields (#x) / parameter properties / accessor keyword / abstract accessors：各自需要的形状未就绪

// ===== base 10: private identifiers, parameter properties, accessor keyword =====
class C { #x = 1; }
class C { #x; }
class C { #x = a; }
class C { #x: A; }
class C { #m() {} }
class C { #m(a: A): B { return a; } }
class C { get #x() { return 1; } }
class C { set #x(v) {} }
class C { #x = 1; #y = 2; }
class C { #m() {} #n() {} }
class C { #x = 1; m() {} }
class C { constructor(private x: A) {} }
class C { constructor(public x: A) {} }
class C { constructor(readonly x: A) {} }
class C { constructor(protected x: A) {} }
class C { constructor(private readonly x: A) {} }
class C { constructor(private x) {} }
class C { constructor(a, private b) {} }
class C { constructor(a: A, private b: B) {} }
class C { constructor(private x: A, b) {} }
class C { constructor(private x: A) {} m() {} }
class C { accessor x = 1; }
class C { accessor x: A; }
class C { accessor x; }
class C { static accessor x = 1; }
class C { accessor x = 1; accessor y = 2; }
class C { accessor x = 1; m() {} }
// + trivia
class C { /* c */ #x = 1; }
class C { #x /* c */ = 1; }
class C { #m(/* c */ a) {} }
class C { constructor(/* c */ private x: A) {} }
class C { constructor(private /* c */ x: A) {} }
class C { /* c */ accessor x = 1; }
class C { accessor /* c */ x = 1; }
class C { accessor x /* c */ = 1; }

// ===== deferred =====
// private-in expression: #x in obj  (needs expressions/expression-builder ParsePrimary dispatch for Symbol "#"; not in this write scope)
// decorators: @dec class C {} / class C { @dec m() {} } / @dec x = 1 (needs class candidate "@"+decorator prefix + Decorator shape)
// abstract accessors, parameter decorators, decorator metadata

// ===== base 11: decorators (class + member) =====
@dec class C {}
@a @b class C {}
@a @b @c class C {}
@dec() class C {}
@dec(a) class C {}
@a.b class C {}
@dec abstract class C {}
@dec declare class C {}
@dec class C {} @dec2 class D {}
class C { @dec m() {} }
class C { @dec x = 1; }
class C { @a @b m() {} }
class C { @dec get x() { return 1; } }
class C { @dec set x(v) {} }
class C { @dec m(a: A): B { return a; } }
class C { @dec() m() {} }
class C { @dec() x = 1; }
class C { @a.b m() {} }
class C { @dec x = 1; @dec2 y = 2; }
class C { @dec x; }
// + trivia
@dec /* c */ class C {}
@ /* c */ dec class C {}
@a /* c */ @b class C {}
class C { @dec /* c */ m() {} }
class C { @ /* c */ dec m() {} }
class C { @a /* c */ @b m() {} }
class C { @dec\nm() {} }
class C { @dec /* c */ x = 1; }
@dec class C { @m2 dec() {} }

// ===== deferred =====
// parameter decorators: constructor(@dec x: A)  (needs parameter prefix dispatch)
// decorator metadata / emitDecoratorMetadata
// decorators on interfaces / enums
// newline between a decorator and its declaration: @dec\nclass C {} is blocked by the root end candidate ASI rule
// (IsAsiBoundary sees an expression-complete `dec` at the newline; same family as newline-before-body, source-file-end-possible-shape scope)

// ===== base 12: method modifiers (async / generator / async-generator) =====
class C { async m() {} }
class C { async m(a: A): B { return a; } }
class C { static async m() {} }
class C { private async m() {} }
class C { async m() {} async n() {} }
class C { *m() {} }
class C { *m() { yield 1; } }
class C { *m(a: A): B { yield a; } }
class C { static *m() {} }
class C { private *m() {} }
class C { *m() {} *n() {} }
class C { async *m() {} }
class C { async *m() { yield 1; } }
class C { static async *m() {} }
class C { async *m(a: A): B { yield a; } }
class C { public get x() { return 1; } }
class C { public set x(v) {} }
class C { private get x() { return 1; } }
class C { async get x() { return 1; } }
class C { async set x(v) {} }
class C { static get x() { return 1; } }
class C { @dec async m() {} }
class C { @dec *m() {} }
class C { @dec async *m() {} }
class C { @a @b *m() {} }
// + trivia
class C { async /* c */ m() {} }
class C { /* c */ *m() {} }
class C { * /* c */ m() {} }
class C { async * /* c */ m() {} }
class C { static /* c */ *m() {} }
class C { @dec /* c */ async m() {} }
class C { public /* c */ get x() { return 1; } }
class C { *m() { /* c */ yield 1; } }

// ===== deferred =====
// abstract accessors: abstract class C { abstract get x(): A; }
// overload + async / generator combos: async m(): A; async m() {}
// object literal methods with async/generator: expressions family scope
// ===== base 12: generic function declarations (TypeParameter[] between Identifier and Parameter[]) =====
function f<T>(a: T): T { return a; }
function f<T, U>(a: T, b: U): T { return a; }
function f<T extends A>(a: T) {}
function f<T = A>(a: T) {}
function f<T extends A = B>(a: T) {}
function f<T extends A, U extends B>(a: T, b: U): A { return a; }
function f<T>(a: T): T;
function f<T>(): A { return a; }
function f<T /* c */>(a: T) {}
function f< T >(a: T) {}
function f<T, /* c */ U>(a: T, b: U) {}
/* c */ function f<T>(a: T) {}
function f<T>(/* c */ a: T) {}
declare function f<T>(a: T): T;
// + generator / export combos
function* g<T>(a: T): T { return a; }
export function h<T>(a: T): T { return a; }
// + multiple declarations
function f<T>(a: T) {}\nfunction g<U>(b: U) {}
// async generic function: implemented in base 13 below (AsyncKeyword -> Identifier -> TypeParameter[] -> Parameter[]).
// generic arrow / generic function expression 已由 expression 家族覆盖（<T>(a) => a）。
// ===== base 12: newline between a decorator and its declaration (root end candidate no longer steals the boundary) =====
@dec\nclass C {}
@a @b\nclass C {}
@dec()\nclass C {}
@dec(a)\nclass C {}
@dec\nabstract class C {}
@a\nclass A {}\n@b\nclass B {}
@dec\n\nclass C {}
@dec /* c */\nclass C {}
@dec\nclass C {}\nclass D {}
class C { @dec\n x = 1; }

// ===== base 13: async function with type parameters (AsyncKeyword -> [*] -> Identifier -> TypeParameter[] -> Parameter[]) =====
async function f<T>(a: T): T { return a; }
async function f<T, U>(a: T, b: U) {}
async function f<T extends A>(a: T) {}
async function f<T = A>(a: T): T { return a; }
async function f<T extends A = B>(a: T) {}
async function f<T>(): T { return a; }
// + async generator with type parameters
async function* g<T>() {}
async function* g<T>(a: T) { yield a; }
// + declare / export combos
declare async function f<T>(a: T): T;
export async function f<T>(a: T): T { return a; }
export async function* g<T>(a: T) { yield a; }
// + trivia
async /* c */ function f<T>(a: T) {}
async function /* c */ f<T>(a: T) {}
async function f /* c */ <T>(a: T) {}
async function f<T /* c */>(a: T) {}
async function f<T>(/* c */ a: T) {}
async function f<T>(a: T): /* c */ T { return a; }
// + multiple declarations
async function f<T>(a: T) {}\nasync function g<U>(b: U) {}
// ===== deferred =====
// async generic overload signature without body: `async function f<T>(a: T): T;` -- not legal TS without
// declare (async overload signatures are rejected); the declare form above covers the signature path.
// ===== base 13: ambient no-body functions without return type (declare implies ambient) =====
declare function f(a: A);
declare function f()\n
declare function f(a: A);\n
declare /* c */ function f();
declare /* c */ function f(a: A);
declare function /* c */ f();
// inside an ambient module / namespace the declare is implicit
declare module "m" { function f(); }
declare namespace N { function f(); }
declare module "m" { function f(a: A); }
declare module "m" { function f(); function g(): void; }
declare module "m" { function f(): void; function g(); }
declare namespace N { function f(): void; function g(); }
declare module "m" { function f();\nlet x: number; }
declare namespace N { function f();\ninterface I {} }
// regression controls (already covered above, kept here for ownership clarity):
// declare function f(): void;      <- explicit return type
// function f(a: A): B;             <- non-declare overload signature (root) still requires a return type
// deferred: non-ambient `namespace N { function f(); }` -> module-block passes ambient=false, shape rejects;
// that spelling is a TS semantic error (implementation missing), not a parse-level gap.
// ===== base 13: heritage expression carriers + qualified/generic names =====
class C extends mixin(B) {}
class C extends a.b {}
class C extends a.b.c {}
class C extends f() {}
class C extends f(a.b) {}
class C extends mixin(B).x {}
class C extends (a) {}
class C extends (a, b) {}
class C extends (a ? B : C) {}
class C extends null {}
class C extends A<B> {}
class C extends A implements I.J {}
class C implements I.J {}
class C implements I.J.K {}
class C implements I<J> {}
class C implements A, B<C> {}
class C implements mixin(B) {}
class C implements A, B, C<D> {}
interface I extends A.B {}
interface I extends A<B> {}
interface I extends A, B<C> {}
interface I extends A.B<C> {}
class C extends /* c */ mixin(B) {}
class C extends mixin(/* c */ B) {}
class C extends a /* c */ . b {}
class C extends a.b /* c */ {}
class C implements /* c */ I.J {}
class C implements I /* c */ . J {}
class C implements I<J /* c */> {}
interface I extends /* c */ A.B {}
interface I extends A /* c */ . B {}
interface I extends A<B /* c */> {}
class C extends mixin(B) { m() {} }
// `extends null`: TS parses it as Identifier named "null" (syntax-error recovery); our name path gives the same kind, kept as a case above.
// heritage with generic call `extends mixin<T>(B)` and decorator-like expressions: needs more expression grammar/tuple args; deferred.
// expression carriers that need statements/arrow/object-literal grammar (e.g. extends (() => B)): deferred.

// ===== base 14: return type predicates on function declarations (TypePredicate) =====
function isA(x: any): x is A { return true; }
function isB(x: any): x is B { return false; }
function isA(x: any): x is A;
function assertA(x: any): asserts x is A {}
function assertB(x: any): asserts x {}
declare function isA(x: any): x is A;
declare function assertA(x: any): asserts x is A;
export function isA(x: any): x is A { return true; }
export function assertB(x: any): asserts x {}
// + trivia
function isA(x: any): /* c */ x is A { return true; }
function isA(x: any): x /* c */ is A { return true; }
function isA(x: any): x is /* c */ A { return true; }
function assertA(x: any): asserts /* c */ x is A {}
function isA(\n x: any\n): x is A { return true; }
// + arrow / function expression / method carriers
class C { m(x: any): asserts x is A {} }
// ===== deferred =====
// TypePredicate 在别的载体上仍红（不是 function-declaration 的返回类型分派问题；各自家族负责）：
//   `const f = (x: any): x is A => true;`                  <- expression 家族：箭头返回类型分派（ParseArrowBody）
//   `(function (x: any): x is A { return true; });`         <- expression 家族：函数表达式返回类型分派
//   `class C { m(x: any): x is A { return true; } }`        <- members/class 家族：方法返回类型走自己的解析
// `// ` const f = (x: any): x is A => true;
// `// ` (function (x: any): x is A { return true; });
// `// ` class C { m(x: any): x is A { return true; } }
// 对照：`class C { m(x: any): asserts x is A {} }` 已绿（asserts 方法走的是参数解析后的同一条 TypeBuilder 谓词口）。
// arrow with `asserts` return type: `const f = (x: any): asserts x is A => {};` 同上属 expression 家族。
// ===== base 14: heritage generic call =====
class C extends mixin<T>(B) {}
class C extends (mixin<T>(B)) {}
class C extends mixin<T, U>(B) {}
class C extends mixin<T>(B, C2) {}
class C extends a.b<T>(B) {}
class C extends mixin<T>(B).x {}
interface I extends mixin<T>(B) {}
class C extends /* c */ mixin<T>(B) {}
class C extends mixin<T>(/* c */ B) {}
class C extends mixin /* c */ <T>(B) {}
interface I extends /* c */ mixin<T>(B) {}
// ===== base 14: ambient variable statements (declare const/let/var) =====
declare const x: number;
declare let y: string;
declare var z = 1;
declare const a: number, b: string;
declare const x: number
declare /* c */ const x: number;
declare const /* c */ x: number;
declare module "m" { declare const x: number; }
{ declare const x: number; }
// controls (already green, kept for ownership clarity)
const x = 1;
let y: string;
var z = 1;
// deferred: `declare\nconst x: number;` -- TS ASI splits it into ExpressionStatement(`declare`) +
// VariableStatement; the repo still falls into the EOF ExpressionStatement fallback here because the root
// end candidate's IsAsiBoundary does not fire at a non-statement-word `declare` prefix.
// deferred: `declare const x: number // c\n` (trailing comment, no semicolon) -- statement candidate and
// root end candidate both stay live at EOF (CatalogGuide conflict); needs an EOF-aware end-candidate tweak.

// ===== base 15: declare ASI split + trailing-trivia EOF (root end candidate owns the tail) =====
// standalone `declare` line then a variable statement: TS = ExpressionStatement(declare) + VariableStatement
declare\nconst x: number;
declare\nconst x = 1;
declare\n\nconst x: number;
declare /* c */\nconst x: number;
// variable statement ends at EOF with trailing trivia (no semicolon): end fallback builds it via StatementBuilder
declare const x: number // c\n
declare const x: number /* c */
declare let y: string // c\n
// same family for ordinary variable statements (previous behavior was a CatalogGuide conflict)
const x = 1 // c\n
let y: string\n
// controls (already green)
declare const x: number;
declare function f(): void;
a\n++b;
a\nb;
// (restored) member decorator cases from earlier chunks
// ===== base 15: method return predicates + parameter decorators =====
class C { m(x: any): x is A { return true; } }
class C { m(x): x is A { return true; } }
class C { static m(x: any): x is A { return true; } }
class C { m(a: A, b: B): x is C { return true; } }
class C { m(): this is A { return true; } }
class C { get x(): asserts this is A {} }
class C { m(x: any): x is A { return true; } n(y: any): asserts y {} }
interface I { m(x: any): x is A; }
interface I { m(x: any): asserts x is A; }
interface I { m(x: any): x is A; n(): void; }
class C { m(x: any): x /* c */ is A { return true; } }
class C { m(x: any): asserts /* c */ x is A {} }
class C { m(x: any): x is /* c */ A { return true; } }
interface I { m(x: any): asserts /* c */ x is A; }
class C {\n  m(x: any): x is A {\n    return true;\n  }\n}
// object literal method predicates `({ m(x: any): x is A { return true; } })`: needs expression-builder method parsing; expression family scope.
// parameter decorators with call/qualified expressions (`@dec() x`, `@a.b x`): only plain `@name` supported here.
// constructor return predicates / assertions on setters: invalid TypeScript, skipped.
// parameter decorators (`constructor(@dec x: A)`, `m(@dec x: A)`): DEFERRED -- needs TypeBuilder.ParseParameter surgery
// (decorator prefix consumes tokens before the parameter name; planned for a later chunk).
// ===== base 16: generic class/interface declarations =====
class C<T> {}
class C<T extends A> {}
class C<T = A> {}
class C<T extends A = B> {}
class C<T, U> {}
class C<T, U extends A = B> {}
class C<T> extends B<T> {}
class C<T> implements I<T> {}
class C<T> extends B<T> implements I<T> {}
class C<T> { m(x: T): T { return x; } }
class C<T extends A> { x: T; m(a: T, b: U): V { return a; } }
interface I<T> {}
interface I<T extends A> {}
interface I<T = A> {}
interface I<T> extends J<T> {}
interface I<T> { m(x: T): T; }
interface I<T, U> extends J<T>, K<U> {}
namespace N { class C<T> {} }
namespace N { interface I<T> { m(x: T): T; } }
// + trivia
class C /* c */ <T> {}
class C< /* c */ T> {}
class C<T /* c */> {}
class C<T extends /* c */ A> {}
class C<T> /* c */ extends B<T> {}
interface I /* c */ <T> {}
interface I< /* c */ T> {}
interface I<T> /* c */ extends J<T> {}
class C<\n  T extends A,\n  U = B\n> {}

// ===== deferred =====
// class expression with type parameters `(class<T> {})`: expression-builder class-expression path has no type parameter list; expressions family scope.
// `class C<T<U>> {}` nested type parameter: TypeBuilder.ParseTypeParameterList splits the combined `>>` token only in some paths; deferred until a focused type-parameter chunk.
// ===== enum member initializers（EnumMember children = name + initializer；= 与 , 不进 Data）=====
enum E { A = 1 << 2 }
enum E { A = -1 }
enum E { A = ~0 }
enum E { A = 1 | 2 }
enum E { A = 1 & 2 }
enum E { A = 1 + 2 * 3 }
enum E { A = 'a' }
enum E { A = "a" }
enum E { A = `x` }
enum E { A, B = 1, C }
enum E { A = 1, B = A + 1 }
enum E { A = 1, B, C = 3 }
enum E { 'a' = 1 }
enum E { "a" = 1 }
enum E { 1 = 1 }
enum E { A /* c */ = 1 }
enum E { A = 1 /* c */, B = 2 }
enum E { /* c */ A = 1 }
enum E { A = (1) }
enum E { A = 1 + 2, B = 3 }
enum E { A = -1, B = ~0 }
// 暂缓：`const enum` / `declare const enum` —— root 候选 coexist 问题：`const` 同时被 statements 的变量声明候选吃掉
// （变量候选 ScanToSemicolon 一直活到 EOF），enum 候选虽在枚举体 `}` 处 Done，但 Candidates>1 不能建；
// 到 EOF 时 enum 候选先 Reject（尾随单元规则），只剩变量候选，于是报「变量声明里有无法识别的单元」。
// 修法需让变量/statement 候选在 `const` 后跟 `enum` 时退出（属 statements 家族，本块 WRITE SCOPE 之外），或
// 给候选优先级（属 core CatalogGuide）。本块已把 enum 名字（StringLiteral/NumericLiteral）与初始化器全部收绿，
// const enum 待 statements/core 侧提供优先级或让位规则后再补。
// ===== base 16: parameter decorators (TS Parameter children: Decorator(s), [modifiers], Identifier, Type) =====
class C { constructor(@dec x: A) {} }
class C { constructor(@dec x: A, y: B) {} }
class C { m(@dec x: A) {} }
class C { m(@a @b x: A) {} }
class C { m(x: A, @dec y: B) {} }
class C { m(@dec x: A, y: B) {} }
// + parameter properties with decorators
class C { constructor(@dec private x: A) {} }
class C { constructor(@dec readonly x: A) {} }
class C { constructor(@dec public x: A) {} }
class C { constructor(@dec private readonly x: A) {} }
// + decorator expression shapes
class C { constructor(@dec() x: A) {} }
class C { constructor(@a.b x: A) {} }
class C { constructor(/* c */ @dec x: A) {} }
class C { constructor(@dec /* c */ x: A) {} }
class C { constructor(@ /* c */ dec x: A) {} }
class C { constructor(@dec\nx: A) {} }
class C { m(@dec x?: A) {} }
// function parameter decorators (`function f(@dec x: A) {}`/: `(function (@dec x: A) {})`): TS parser accepts them,
// but function-declaration-shape has its OWN BuildParameters head dispatch (not class BuildParameters) and is out of
// this chunk's write scope -> reported as deferred owner: declarations/function-declaration-shape BuildParameters.
// `// ` function f(@dec x: A) {}
// `// ` (function (@dec x: A) { return x; });

// ===== nested type args in declaration heads / heritage / returns（`>>` 拆分） =====
class C<T extends A<B>> {}
interface I<T extends A<B>> {}
function f<T extends A<B>>() {}
class C<T = A<B>> {}
class C extends A<B<C>> {}
interface I extends A<B<C>> {}
function f(): A<B<C>> {}
class C { m(): A<B<C>> { return x; } }
// trivia
class C<T extends A<B> /* c */> {}
function f<T extends A<B> >() {}
// ===== const enum / declare const enum（root 候选共存：const 后 raw lookahead 见 enum 时变量候选让位）=====
const enum E { A }
const enum E { A = 1, B = 2 }
const enum E { A = 1 << 2 }
const enum E { A, B }
const  enum E { A }
const\nenum E { A }
const /* c */ enum E { A }
declare const enum E { A }
declare const enum E { A = 1 }
declare /* c */ const enum E { A }
export const enum E { A }
const enum E { A }\nconst enum F { B }
const enumx = 1;
let enumy = 1;
var enumz = 1;
const /* c */ x = 1;
// 暂缓：namespace / module 体内的 `const enum`（本块只修 root）：body 成员由 module-block-shape.BuildMember
// 分派，`const` 直接落到 StatementBuilder.BuildStatement → BuildVariableStatement，看不到后面的 `enum`；
// 需 module-block-shape 的 BuildMember 认 `[declare] const enum` 并调 EnumDeclarationShape.FromUnits
// （属 module 文件，本块 WRITE SCOPE 之外）；语料已按任务要求先试，确认只差这一处分派。