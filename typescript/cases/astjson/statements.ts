// statements family：chunk 1（核心语句）+ chunk 2（switch / try / with / 解构 / 类型注解）
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。以 // 开头的行是暂缓目标，不煮进用例。

// S1 空语句
;
// S2 块
{}
{ let x = 1; }
{ ; }
{ let x = 1;\nlet y = 2; }
{ lbl: b; }
// S3 变量语句（var / let / const，单 / 多声明）
let x = 1;
var a, b;
const c = 2, d = 3;
var z;
let a1 = 1, b1 = 2, c1 = 3;
// S4 类型注解（TypeBuilder）
let x: number = 1;
var t: boolean;
let s: string = "a";
let x : number = 1;
for (let i: number = 0; i < 3; i++) {}
// S5 解构绑定（bindings chunk）
let [a, b] = x;
let [a] = x;
let {a, b} = x;
let {a: c} = x;
let [ a , b ] = x ;
let { a , b } = x ;
for (const {a} of xs) a;
for (const [a] of xs) a;
// S6 if / else / else-if
if (a) b;
if (a) { b; } else c;
if (a) b; else if (c) d; else e;
if (a) ;
if (a) { b; }\nelse { c; }
if (a) if (b) c; else d;
if (a) {}\nelse {}
// S7 while
while (a) b;
while (a) { b; }
while (a) ;
// S8 do-while
do b; while (a);
do { b; } while (a);
do if (a) b; while (c);
// S9 for（三子句）
for (;;) {}
for (let i = 0; i < 3; i++) { b; }
for (i = 0; i < n; i++) ;
for (; a; ) b;
for (let i = 0, j = 1; i < 3; i++) {}
// S10 for-in / for-of
for (x in o) b;
for (const k in o) b;
for (x of o) b;
for (let v of o) b;
for (const k of o) { b; }
// S11 switch
switch (x) { case 1: a(); break; default: b(); }
switch (x) {}
switch (x) { case 1: case 2: a(); break; case 3: b(); }
switch (x) { default: a(); case 1: b(); }
switch (a) { case 1: switch (b) { case 2: c(); } }
switch (x) { case 1: }
switch (x) { default: }
switch (f(1)) { case g(2): a(); }
switch (x) {\ncase 1: a();\nbreak;\ndefault: b();\n}
/* c */ switch (x) { case 1: a(); } // tail
// S12 try / catch / finally
try { a(); } catch (e) { b(); }
try { a(); } catch { b(); }
try { a(); } finally { b(); }
try { a(); } catch (e) { b(); } finally { c(); }
try { try { a(); } catch (e) { b(); } } finally { c(); }
try { a(); } catch (e) { b(); } // tail
try { a(); }\ncatch (e) { b(); }
try { a(); } catch (e) { try { b(); } finally { c(); } }
// S13 with
with (x) { a(); }
with (x) a();
// S14 return / break / continue / throw / debugger
return a;
return;
break;
break lbl;
continue;
continue lbl;
throw e;
debugger;
// S15 trivia 变体（前导 / 词间注释、词间多空格、词间换行、行尾注释）
/* c */ let x = 1;
let /* c */ x = 1;
let   x   =   1 ;
if (a) { b; } // tail
let x = 1; // tail
if\n(a) b;
while (a) { b; } // tail
for (let i = 0; i < 3; i++) { b; } // done
if ( a ) b ; else c ;
for ( x in o ) b ;
do b ; while ( a ) ;
// S16 重复形（同一文件多条语句）
let x = 1;\nlet y = 2;
;\n;
{} \n { let x = 1; }
switch (x) { case 1: a(); }\nlet z = 2;
try { a(); } catch (e) { b(); }\nlet w = 3;
// 暂缓：ASI（无分号断句，属 cover-end-1）
// a\n++b;
// 暂缓：根级标签语句（与 expression 候选在「标识符起头」上冲突，见 docs/coverage-statements.md）
// lbl: b;
// 暂缓：函数 / 类声明（后续 declarations 成员）
// function f() {}
// class C {}
// S17 if/else 链 trivia 与重复形
if /* c */ (a) b;
if ( /* c */ a /* c */ ) b;
if (a) /* c */ b;
if (a) /* c */ ;
if (a) { /* c */ }
if (a) {\nb;\n} else {\nc;\n}
if (a) b;\nelse c;
if (a) { b; } else /* c */ { c; }
if (a) b; else if /* c */ (c) d; else e;
if (a) { } else if (b) { } else { }
if (a)\n{ b; }
if (a) { b; c; } else { d; }
// S18 while / do-while trivia 与重复形
while /* c */ (a) b;
while (a) /* c */ b;
while (a)\n{ b; }
while (a) { /* c */ }
while (a) { b; c; }
while (a) {\nb;\nc;\n}
do /* c */ b; while (a);
do { b; c; } while (a);
do { /* c */ } while (a);
do b;\nwhile (a);
// S19 for / for-in / for-of trivia 与重复形
for /* c */ (;;) {}
for (;;) /* c */ {}
for (let i = 0; i < 3; i++)\n{ b; }
for (let i = 0; i < 3; i++) { /* c */ }
for (;;) { b; c; }
for (let i = 0; i < 3; i++) { let x = 1; b; }
for (x in o) /* c */ b;
for (x in o)\n{ b; }
for (x of o) { b; c; }
for (const k in o) { /* c */ }
for (const k of o)\n{ b; }
for (x of o) /* c */ { b; }
// S20 变量语句 trivia 与重复形
let a = 1, b, c = 2;
var a, b, c;
let /* c */ a = 1, /* c */ b = 2;
let a = 1, /* c */ b = 2;
let a = f(1), b = g(2);
var a = 1, b = 2; // tail
let x = 1; /* c */
let x = 1;\nlet y = 2;\nlet z = 3;
let x = 1, y = 2;\nvar z;
const a = 1, b = 2, c = 3;
// S21 switch trivia 与重复形
switch /* c */ (x) { case 1: a(); }
switch (x) /* c */ { case 1: a(); }
switch (x) { /* c */ case 1: a(); }
switch (x) { case /* c */ 1: a(); }
switch (x) { case 1 /* c */ : a(); }
switch (x) { case 1: /* c */ a(); }
switch (x) { case 1: a(); /* c */ break; }
switch (x) { default: /* c */ b(); }
switch (x) { case 1: a();\ncase 2: b();\ndefault: c(); }
// S22 try / catch / finally trivia 与嵌套
try /* c */ { a(); } catch (e) { b(); }
try { a(); } /* c */ catch (e) { b(); }
try { a(); } catch /* c */ (e) { b(); }
try { a(); } catch ( /* c */ e /* c */ ) { b(); }
try { a(); } catch (e) /* c */ { b(); }
try { a(); } catch (e) { /* c */ }
try { a(); } catch (e) { b(); } /* c */ finally { c(); }
try { a(); } catch { b(); } finally { c(); }
try { a(); } finally { /* c */ }
try {\na();\n} catch (e) {\nb();\n} finally {\nc();\n}
try { try { a(); } catch (e) { b(); } } catch { c(); }
// S23 with trivia 与重复形
with /* c */ (x) { a(); }
with (x) /* c */ { a(); }
with (x) { /* c */ }
with (x) { a(); b(); }
// S24 labeled / break / continue / throw / return / debugger trivia
{ lbl /* c */ : b; }
{ lbl: /* c */ b; }
{ lbl: b; /* c */ }
break /* c */ lbl;
continue /* c */ lbl;
return /* c */ a;
return /* c */ ;
throw /* c */ e;
debugger /* c */ ;
throw e /* c */ ;
// S25 混排（同文件 3~5 条语句 + 注释）
let x = 1;\nif (a) {\nb;\n}\nwhile (c) d;
switch (x) { case 1: a(); }\ntry { b(); } catch (e) { c(); }\nlet z = 1;
/* c */ let x = 1;\n/* c */ if (a) b;\n/* c */ while (c) d;
let x = 1; if (a) b; while (c) d; for (;;) {}
with (x) a();\ndo b; while (c);\ndebugger;


// ===== 来自 cover-statements-3 的 case 表达式 / catch 解构用例（APPEND UNION 合并） =====
// S17 case expression terminator (colon at ternary depth 0)
switch (x) { case a ? b : c: break; }
switch (x) { case a ? b : c ? d : e: break; }
switch (x) { case (a, b): break; }
switch (x) { case a || b: break; }
switch (x) { case a = b: break; }
switch (x) { case a ? b : c: a(); break; default: d(); }
switch (x) { default: a(); case a ? b : c: b(); }
switch (x) { case a ? b : c: case d: e(); }
switch (x) { case /* c */ a ? b : c /* c */ : break; }
switch (x) { case a ? b : c: /* c */ break; }
switch (x) { case a ? b :\nc: break; }
// S18 switch nesting / multiple statements / fallthrough
{ switch (x) { case 1: a(); } }
if (a) { switch (x) { case 1: b(); } }
switch (x) { case 1: a(); b(); c(); }
switch (x) { case 1: a();\ncase 2: b();\nbreak;\ndefault: c(); }
switch (x) { case 1: /* c */ case 2: a(); break; }
switch (x) { case 1: { a(); b(); } }
switch (x) { case 1: if (a) b; else c; }
switch (x) { case 1: { a(); }\ncase 2: b(); }
// S19 catch destructuring bindings
try { a(); } catch ({ message }) { b(); }
try { a(); } catch ([a, b]) { c(); }
try { a(); } catch ({ a, b }) { c(); }
try { a(); } catch ({ a: c }) { b(); }
try { a(); } catch ([a]) { b(); } finally { c(); }
try {} catch ({ message }) {}
try {} catch ([a, b]) {}
try { a(); } catch (/* c */ { a }) { b(); }
// S20 for-of / for-in destructuring trivia
for (const [a, b] of xs) a;
for (const { a } of xs) a;
for (const {a: c} of xs) c;
for (const [ a , b ] of xs) a;
for (const [a] of xs)\na;
for (const { a } of xs) { a; b; }
for (const [a] of xs) /* c */ a;
// S21 mixed statements
switch (x) { case a ? b : c: break; }\nfor (const [a] of xs) a;
try { a(); } catch ({ message }) { b(); }\nlet z = 1;
// ===== sweep4: optional catch / loop-semicolon edges / switch empty / with / debugger / empty / labeled-empty =====
try {} catch {}
try /* c */ {} catch /* c */ {}
for (;;);
for ( ; ; ) ;
for (;;) /* c */ ;
while (a);
while (a) /* c */ ;
do a(); while (b);
do {} while (b);
do {} while (b)
do {} while (b)\na;
do /* c */ {} while (b);
do {} /* c */ while (b);
switch (a) {}
switch (a) { default: }
switch (a) { case 1: }
switch (a) { default: break; }
switch (a) { /* c */ }
switch (a) { default: /* c */ }
with (a) b;
with (a) {}
with /* c */ (a) b;
debugger
debugger /* c */;
;;
;;;
lbl: ;
lbl /* c */ : ;
do {} while (b) a;
do {} while (b) // c\na;
do {} while (b) /* c */ ;
do {} while (b)\n;
// ===== sweep5: switch lexical/decl bodies, try/finally, throw, labeled jumps, else-if chains =====
switch (a) { case 1: let x = 1; break; }
switch (a) { case 1: const y = 2; }
switch (a) { case 1: var z = 3; }
switch (a) { case 1: function f() {} }
switch (a) { case 1: { let x = 1; } }
switch (a) { default: let x = 1; }
switch (a) { case 1: let x = 1; case 2: let y = 2; }
switch (a) { case 1: /* c */ let x = 1; }
switch (a) { case /* c */ 1: }
try {} finally {}
try {} catch (e) {} finally {}
try {} catch {} finally {}
try { try {} finally {} } finally {}
try {} finally { try {} finally {} }
try /* c */ {} finally /* c */ {}
throw a;
throw new E();
throw a.b;
throw /* c */ a;
throw (a);
throw a;\nthrow b;
throw a;\nlet x = 1;
lbl: for (;;) { continue lbl; }
lbl: switch (a) { case 1: break lbl; }
lbl: for (;;) { break lbl; }
outer: for (;;) { inner: for (;;) { continue outer; } }
lbl /* c */ : for (;;) { continue lbl; }
if (a) {} else if (b) {} else {}
if (a) ; else if (b) ; else ;
if (a) {} else if (b) {} else if (c) {} else {}
if (a) {} else /* c */ if (b) {} else {}
// 暂缓：`throw\na;`（throw 后换行）——TS 做错误恢复：ThrowStatement 子节点是一个 **zero-width Identifier**
// (Pos==End 同一点)，且 ThrowStatement 的 End 取下一 token 的起点；cj 的 Shape/SourceRange 模型表达不了 zero-width 节点，
// 属核心形状/错误恢复范围，本 sweep 只收正常 throw 形态（`throw a;` 等已绿）。
// ===== ASI continuation edges（oracle: 单条 / 两条 / 非法三类）=====
// 继续成一条表达式（不应 ASI 断）
a\n[b]
a\n(b)
a\n[b](c)
a\n`x`
a\n+b
a\n-b
a\n/b/g
a\n?.b
// ++ / -- 是受限产生式：换行后 ASI 断成两条
a\n++b
a\n--b
// return / break / continue 的 ASI 断
function f() { return\na; }
function f() { return\n(a); }
function f() { break\nlbl; }
lbl: for (;;) { break\nlbl; }
lbl: for (;;) { continue\nlbl; }
// 初始化器里的换行继续
const x = a\n+b
const x = a\n(b)
// 暂缓：`throw\na` —— TS 错误恢复产生 zero-width Identifier 子节点 + End 取下一 token 起点，cj Shape 表达不了（core-blocked，见 statements 覆盖文档）
// 非法（TS parseDiagnostics，不进基准）：`a\nas T`、`a\nsatisfies T`、`a\n=`
// ===== using / await using（oracle: keyword 不进 children，仅 VariableDeclarationList flags/pos）=====
using x = f();
{ using x = f(); }
function g() { using x = f(); }
async function f() { await using x = g(); }
await using x = g();
for (using x of xs) {}
async function f() { for (await using y of ys) {} }
for (await using y of ys) {}
for (using x in xs) {}
using x = f(), y = g();
using /* c */ x = f();
using x /* c */ = f();
const x = 1; using y = f();
using x = f();\nusing y = g();
for (const x of xs) {}
{ await using x = g(); }
async function f() { for (await using y of ys) { await g(); } }
for (using x of xs) b;
async function f() { for (await using y of ys) b; }
using  x = f();
async function f() { await  using x = g(); }
using x = f(); // c
using x = f();\nconst y = 1;
for (using x of xs) { using y = f(); }
// ===== sweep 7: with / debugger / labels =====
with (x) a;
with (x) {}
/* c */ with (x) a;
with /* c */ (x) a;
debugger\n;
lbl: { a(); }
lbl: a;
outer: for (;;) { break outer; }
outer: while (x) { continue outer; }
outer: for (;;) { inner: while (x) { break outer; } }
outer: for (;;) { inner: while (x) { continue inner; } }
/* c */ lbl: a;
// ===== sweep 7: dangling else =====
if (a) if (b) x(); else y();
if (a) { if (b) x(); } else y();
if (a) if (b) if (c) x(); else y; else z;
if (a) if (b) x(); else if (c) y(); else z;
// ===== sweep 7: switch variants =====
switch (x) { case 1: a(); case 2: b(); }
switch (x) { case 1: a(); break; }
switch (x) { case 1: {} }
switch (x) { case 1: { a(); } break; }
switch (x) { case 1: switch (y) { case 2: a(); } break; }
switch (x) { case 1: a(); default: b(); }
// ===== sweep 7: try variants =====
try {} catch (e) {}
try { try {} catch {} } finally {}
try {} catch ({ a }) {}
try {} catch (e) {} finally { c(); }
/* c */ try {} catch {}
// ===== sweep 7: for variants =====
for (;;) ;
for (;;) a;
for (let i = 0; ; ) {}
for (let i = 0; i < 3; i++) a;
for (i = 0; ; ) {}
for (;;) { break; }
for (;;) { continue; }
// ===== expression-statement 起始 token 矩阵（ExpressionStatement children = expression only）=====
!a;
-a;
+a;
~a;
typeof a;
void a;
delete a.b;
await x;
new A();
this.x;
(a);
[a, b];
({});
`x`;
/re/;
1;
's';
a => a;
#x in obj;
import.meta;
function f() { new.target; }
function* g() { yield; }
class C { m() { super.x; } }
async function f() { await x; }
// 块内同形态
{ !a; }
{ typeof a; }
{ void a; }
{ delete a.b; }
{ await x; }
{ new A(); }
{ this.x; }
{ (a); }
{ [a, b]; }
{ ({}); }
{ `x`; }
{ /re/; }
{ 1; }
{ 's'; }
{ a => a; }
{ import.meta; }
// 非法（oracle：TS parseDiagnostics，不进基准）：`function () {};`（函数声明缺名）、`class {};`（类声明缺名，TS 用错误恢复产出 ClassDeclaration + EmptyStatement）
// 暂缓：块内 class 声明 `{ class D {} }`（TS: Block -> ClassDeclaration；cj StatementBuilder 把 class 走成
// ExpressionStatement(ClassExpression)）——块内 class 声明分派属 statements builder / class 家族，本块 WRITE SCOPE 只含
// expression-statement-possible，故写成目标；root 的 class 声明与 method 内 super.x 已绿。
// ===== 块级 class / function 声明（TS: Block -> ClassDeclaration / FunctionDeclaration）=====
{ class D {} }
{ class D { m() {} } }
{ class D { m() { return 1; } } }
{ class D extends B {} }
{ class D { constructor() {} } }
{ function f() {} }
{ function f(a) { return a; } }
function g() { function h() {} }
{ class D {} function f() {} }
{ async function f() {} }
{ function f() { class D {} } }
if (a) { class D {} }
for (;;) { function f() {} }
try { class D {} } catch (e) {}
namespace N { function f() {} }
namespace N { class D {} }
{ /* c */ class D {} }
{ class D {} /* c */ function f() {} }
// ===== GAP1：annex-B 带 label 的函数 / 类声明（TS: LabeledStatement > FunctionDeclaration / ClassDeclaration）=====
lbl: function f() {}
lbl: function f(a) { return a; }
lbl: function* g() {}
lbl: class C {}
lbl: async function f() {}
{ lbl: function f() {} }
// 非法（oracle parseDiagnostics：Identifier expected）：`lbl: function () {}`（缺名函数声明）
// 误报证据：Bare `class<T> {}` / `class<T extends A> {}` 的 TS parseDiagnostics 为空，但 AST 是缺 Identifier/Block 的
//   ClassDeclaration 恢复形态（见 class-expressions 注释）——不是合法 TS 程序，属审计误报，不收。
