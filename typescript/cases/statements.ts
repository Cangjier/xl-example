// statements family chunk 1：base + trivia 变体（IMPORTANCE §5）
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。以 // 开头的行是暂缓目标，不煮进用例。

// S1 空语句
;
// S2 块
{}
{ let x = 1; }
{ ; }
{ let x = 1;\nlet y = 2; }
{ lbl: b; }
// S3 变量语句（var / let / const，单 / 多声明，无类型注解、无解构）
let x = 1;
var a, b;
const c = 2, d = 3;
var z;
let a1 = 1, b1 = 2, c1 = 3;
// S4 if / else / else-if
if (a) b;
if (a) { b; } else c;
if (a) b; else if (c) d; else e;
if (a) ;
if (a) { b; }\nelse { c; }
if (a) if (b) c; else d;
// S5 while
while (a) b;
while (a) { b; }
while (a) ;
// S6 do-while
do b; while (a);
do { b; } while (a);
do if (a) b; while (c);
// S7 for（三子句）
for (;;) {}
for (let i = 0; i < 3; i++) { b; }
for (i = 0; i < n; i++) ;
for (; a; ) b;
for (let i = 0, j = 1; i < 3; i++) {}
// S8 for-in / for-of
for (x in o) b;
for (const k in o) b;
for (x of o) b;
for (let v of o) b;
for (const k of o) { b; }
// S9 return / break / continue / throw / debugger
return a;
return;
break;
break lbl;
continue;
continue lbl;
throw e;
debugger;
// S10 trivia 变体（前导 / 词间注释、词间多空格、词间换行、行尾注释）
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
// S11 重复形（同一文件多条语句）
let x = 1;\nlet y = 2;
;\n;
{} \n { let x = 1; }
// 暂缓：switch / case / default（下一 chunk）
// switch (a) { case 1: break; default: b; }
// 暂缓：try / catch / finally（下一 chunk）
// try { b; } catch (e) { c; } finally { d; }
// 暂缓：with（TS 严格模式下也不推荐）
// with (o) { b; }
// 暂缓：解构绑定（依赖 cover-members-1 的 binding pattern）
// const [a, b] = arr;
// const { p, q } = o;
// 暂缓：ASI（无分号断句，属 cover-end-1）
// a\n++b;
// 暂缓：根级标签语句（与 expression 候选在「标识符起头」上冲突，见 docs/coverage-statements.md）
// lbl: b;
// 暂缓：函数 / 类声明（后续 declarations 成员）
// function f() {}
// class C {}
