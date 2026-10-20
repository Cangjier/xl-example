// labeled statements at root level：标签本体 + 嵌套标签 + break/continue 目标 + trivia，
// 以及「普通表达式不被误判成标签」的回归。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。

// ===== base：根级标签 =====
lbl: b;
lbl: { }
lbl: { break lbl; }
lbl: if (a) b;
lbl: if (a) { break lbl; }
lbl: { a(); b(); break lbl; }
lbl: while (a) { break lbl; }
lbl: while (a) { continue lbl; }
lbl: for (;;) { break lbl; }
lbl: for (x in o) { break lbl; }
lbl: do { break lbl; } while (a);
lbl: switch (x) { case 1: break lbl; }
a: b: c;
a: b: c: d;
a: b: { c(); }
a: while (x) { while (y) { break a; } }

// ===== trivia =====
/* c */ lbl: b;
lbl /* c */ : b;
lbl: /* c */ b;
lbl: b; // tail
lbl:\nb;
lbl: while (a) { /* c */ break lbl; }
lbl: {\na();\nb();\n}
lbl: { /* c */ }
a: b: c; // tail
lbl: b;\nother: c;

// ===== 重复形 / 混排 =====
lbl: b; other: c;
lbl: b;\nother: c;\nthird: d;
let x = 1;\nlbl: b;
lbl: b;\nlet x = 1;

// ===== 回归：普通表达式语句不能被标签判据误 Reject =====
a;
a ? b : c;
a ? b : c ? d : e;
a.b;
a();
a = b;
a, b;
(a, b);
f(a, b);
a;\nlbl: b;
a ? b : c;\nlbl: d;
lbl: b;\na ? b : c;

// 暂缓：标签直接修饰函数/类声明（TS 只允许标签修饰语句，`lbl: function f() {}` 本身语法非法，故不收）
// 暂缓：标签与 ASI 的交互（end 家族边界，见 docs/coverage-statements.md）
