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
