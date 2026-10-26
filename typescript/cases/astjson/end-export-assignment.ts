// end / export 赋值语句（`export = <expr>` / `export default <expr>`）的无分号收口。
// 两种写法在 TS 里都是 ExportAssignment：children 只有表达式，`export` / `=` / `default` 都不是节点；
// Pos = 前一代码单元 End+1，End = 最后一个代码单元 End（无分号时 `;`/trivia 不算）。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。带 `;` 的形态列在末尾作回归。

// ===== C1：`export = <expr>` 无分号到 EOF =====
export = 1
export = a.b
export = f()
export = (a)
export = { a: 1 } // c
export = 1 // c
export = f() /* c */
export = f() /* a\nb */
export = f()\n

// ===== C1：`export = <expr>` 换行后接下一语句（ASI）=====
export = 1\na;
export = 1\na
export = 1\nclass C {}
export = f()\nclass C {}
export = 1 // c\nclass C {}
export = 1 /* c */\na;
export = { a: 1 }\na;
export = a.b\nconst x = 1;
export = 1\n  a;

// ===== C2：`export default <expr>` 换行后接下一语句（ASI）=====
export default x\na;
export default x\na
export default 1\n2;
export default f()\na;
export default x // c\na;
export default x /* c */\na;
export default x\nfunction f() {}
export default x\nclass C {}
export default { a: 1 }\na;
export default () => {}\na;
export default `t`\na;
export default /re/\na;
export default a ? b : c\na;
export default [a]\na;
export default (a)\na;
export default abstract\nclass C {}

// ===== 对照：换行后的单元仍是同一个表达式（不是 ASI 边界）=====
export = a\n+ b;c;
export default a\n+ b;c;
export = a\n(b);
export default a\n(b);
export default a\n? b : c;
export default\n1;
export =\n1;

// ===== 对照：带 `;` / 同一行的形态走老路径（本轮改动不得影响）=====
export = 1;
export = 1;\na;
export default 1;
export default x;\na;
export default /re/;
export default abstract class C {};
declare module "m" { export = x; }
declare module "m" { export = a.b; }
