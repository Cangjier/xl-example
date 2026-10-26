// ASI 边界 × 声明：换行处上一条表达式结束、下一条是 import/export/声明。
// 根终结候选在边界上 Accept 建掉前一条语句，声明候选保持唯一并把声明建出来。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行。

// ── base：换行后是 import 声明 ──
a\nimport b from "m";
a\nimport b from "m";\nc;
a\nimport b from "m"
a\nimport "m";
a\nimport { b } from "m";
a\nimport * as ns from "m";
a\nimport b, { c } from "m";
a\nimport type { T } from "m";

// ── trivia 叠加：边界处的注释 / 块注释 / 空行 ──
a /* c */\nimport b from "m";
a\n/* c */ import b from "m";
a\n// c\nimport b from "m";
a\n\nimport b from "m";

// ── 重复形：多条声明连排 ──
a\nimport b from "m";\nimport c from "n";
a\nimport b from "m";\nimport c from "n";\nd;

// ── 换行后是 export 声明 ──
a\nexport { b };
a\nexport { b } from "m";
a\nexport * from "m";
a\nexport default 1;
a\nexport const x = 1;
a\nexport class C {};

// ── 换行后是其它声明 ──
a\nclass C {}
a\nclass C {}\nb;
a\ninterface I {}
a\nenum E {}
a\ntype T = number;
a\ndeclare function f(): void;

// ── 回归：表达式语句的 ASI 仍然正确 ──
a\n++b;
a\nb;
a\n+b;
[a, b];
a\n(b);
// ===== a / import·export 边界（import 候选演进后重测）=====
a\nimport b from 'm';
a\nimport { b } from 'm';
a\nimport * as ns from 'm';
a\nimport b from 'm';\nc;
a\nexport function f() {}
a\nexport default function f() {}
a\nimport b from 'm';\nimport c from 'n';
a /* c */\nimport b from 'm';
a\n// c\nimport b from 'm';
