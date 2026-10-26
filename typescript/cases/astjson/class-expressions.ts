// class-expressions 用例集：带成员 / 名字 / extends 的 class 表达式。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 快照：node typescript/cases/ast-json.mjs class-expressions && node typescript/cases/ast-json-diff.mjs class-expressions
//
// 口径（TS 实测）：ClassExpression children = 名字? → HeritageClause 们 → 成员；
// 成员与类声明完全同构（PropertyDeclaration / MethodDeclaration / GetAccessor / SetAccessor / Constructor）。

// ===== 1. class 表达式：空体 / 名字 / 成员 =====
(class {});
(class C {});
(class { x = 1; });
(class C { m() {} });
(class { constructor() {} });
(class { m(a: A): B { return a; } });
(class { [k]() {} });
(class { [k]: 1; });
(class C { x = 1; m() {} });
// + extends（heritage 已合入）
(class extends B { m() {} });
(class C extends B { m() {} });
(class extends B {});
// + trivia
(class /* c */ { x = 1; });
(class { /* c */ x = 1; });
(class C /* c */ { m() {} });
(class {\nx = 1;\nm() {}\n});
(class extends /* c */ B { m() {} });

// ===== 暂缓（不在本批）=====
// decorators            (class { @dec m() {} });      ← decorator 家族
// static block          (class { static {} });         ← class extras（另一分支）
// private field         (class { #x = 1; });           ← class extras（另一分支）
// class 表达式做 heritage  (class extends (class {}) {}) ← 需要 heritage 里 ParseExpression，暂缓

// ===== generic class expressions（TS 5.0）：TypeParameter 在名字之前 =====
const C = class<T> { m(x: T): T { return x; } };
(class<T> {});
// 顶层 , 走声明切分，泛型类表达式放括号里
const D = (class<T, U> { a: T; b: U; });
(class /* c */ <T> {});
(class<T> /* c */ {});
// 暂缓：`class<T extends A> {}`（ParseAngleTypeParameters 还不吃 extends）
// ===== 类型参数约束 / 默认值（class 表达式）=====
const CE1 = class<T extends A> { m(x: T): T { return x; } };
const CE2 = class<T = A> { m(x: T): T { return x; } };
(class<T extends A, U = B> {});
(class /* c */ <T extends A> {});
// ===== GAP2：generic class expression 的合法形态（oracle: ClassExpression children = TypeParameter* [HeritageClause] Block）=====
const C = class<T extends A> {};
const C = class<T extends A = B> {};
(class<T, U> {});
(class<T extends A> {});
const C = class<T> extends B {};
const C = class<T, U> extends B {};
class C<T> {}
class C<T extends A> {}
// 误报证据（不收）：`class<T> {}` / `class<T extends A> {}` 裸形态 oracle parseDiagnostics 为空，但 TS 产出的是
//   缺 Identifier 与 Block 的 ClassDeclaration 恢复节点（`class {}` 同样），不是可对拍的合法 AST。
// export default class<T> {}  —— 已由 cover-default-generic-class-1 在 export 家族实现（FromUnitsAllowAnonymous）；此处仅保留历史注记。
