// declarations 鐢ㄤ緥闆嗭細class / interface / enum / function 澹版槑銆?// 涓€琛屼竴涓敤渚嬶紱琛屽唴 \n 鐢?ast-json.mjs 杩樺師鎴愮湡瀹炴崲琛岋紱娉ㄩ噴蹇呴』鐙珛鎴愯銆?// 瀵规媿鍙ｅ緞锛歍S 渚?ts.createSourceFile 鐨?AST锛涙湰浠撲晶 SourceFileRunner.Parse 鐨勫舰鐘舵爲銆?// 蹇収锛歯ode typescript/cases/ast-json.mjs declarations && node typescript/cases/ast-json-diff.mjs declarations
//
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
class C {}
class A {}
class ABC {}
class C1 {}
// + declare 淇グ绗?declare class C {}
declare class D {}
// + abstract 淇グ绗︼紙TS kind 鍙嶆煡鏄?FirstContextualKeyword锛宧arness 鍒悕褰掍竴鍒?AbstractKeyword锛?abstract class C {}
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

// ===== base 2锛欼nterfaceDeclaration锛堢┖鎺ュ彛浣擄級=====
interface I {}
interface A {}
interface ABC {}
// + declare 淇グ绗?declare interface I {}
// + trivia
/* c */ interface I {}
interface /* c */ I {}
interface I /* c */ {}
interface I { /* c */ }
interface I {}\ninterface J {}
/* c */ declare interface I {}
declare interface I { /* c */ }

// ===== base 3锛欵numDeclaration =====
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
// + declare 淇グ绗?declare enum E {}
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

// ===== base 4锛欶unctionDeclaration =====
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
// + 涓庡叾瀹冨０鏄庢贩鎺掞紙閲嶅褰級
function f() {} function g() {}
function f() {}\nfunction g() {}
function f() {} class C {}
class C {} function f() {}
function f() {} interface I {}
interface I {} function f() {}
function f() {} enum E { A }

// ===== base 5锛氬悓涓€鏂囦欢澶氭潯澹版槑锛堥噸澶嶅舰 / 娣锋帓锛?====
class C {} class D {}
class C {}\nclass D {}
interface I {} interface J {}
enum E {} enum F {}
enum E { A } enum F { B }
class C {} interface I {}
interface I {} enum E {}
enum E { A } class C {}
class C {}\ninterface I {}\nenum E { A }\n

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
// + trivia
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
// 瑁呴グ鍣?/ static block / overloads / abstract 鏂规硶锛氬悗缁?chunk
