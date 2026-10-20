// end / possible：语句「到哪儿算到齐」的两种语法边界——EOF 与 ASI。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行（这样多行语句也能逐行对齐）。
// 生成器会 trim 每行，行首空格构不成前导 trivia —— 前导 trivia 用 /* c */ 或 \n 叠加。

// ── EOF 边界：文件末尾没有分号，最后一条语句由根终结候选按边界收尾（原有语义） ──
a
a + b
f()
"s"
1
a; b
a /* c */
a\n
a; // c
a; /* c */
a;\n// c

// ── ASI：换行 + 下一个代码单元接不上 → 断成两条 ──
a\nb;
a\n++b;
a\n--b;
a\n"s";
a\n!b;
a\nb
a\n++b
a\n"s"

// ── ASI 反例：换行 + 下一个代码单元能接上 → 仍是一条 ──
a\n+b;
a\n-b;
a\n(b);
a\n[0];
a\n.b;
a\n? b : c;
a\n= b;
a\n`t`;
a\n+b
a\n(b)

// ── ASI + trivia 叠加：换行前 / 换行后的注释与空白不影响断句 ──
a /* c */\nb;
a\n/* c */b;
a\n// c\nb;
a\n\nb;
a  \n  b;
a /* \n */ ++b;
a\n/* c */\n++b;
a/* c */\n++b;
a;\n// c\nb;

// ── ASI 重复形：多条语句连续断句 ──
a\nb\nc;
a\n++b\nc;
a\n+b\nc;
a\n++b\n--c;

// ── 数组字面量：CanStart 放开 `[`，builder 的 ParsePrimary `[` 分支（本批只放开这一个起点） ──
[a, b];
[];
[a];
[1, 2, 3];
[ a, b ];
[\na,\nb,\n];
[a, b].c;
[a][0];
a;\n[b];
[\n];
[/* c */a];
