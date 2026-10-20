// regex 用例集：正则字面量 `/pattern/flags` 与除号 `/`、表达式上下文的对抗项。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行（这样多行语句也能逐行对齐）。
// 生成器会 trim 每行，行首空格构不成前导 trivia —— 前导 trivia 用 /* c */ 或 \n 叠加。
//
// 为什么要这张表：RegexToken.Transit 现在只看「上一个字符是 / 且可回退」+「Data 倒数第二个单元是
// Common/Bracket 就拒绝」，于是
//   - 中间隔一个空白 / 注释，`a / b` 的除号会被推成「正则起点」（假阳）；
//   - 反方向的接收者不是 Common/Bracket 时（字符串、`!`、`++`、关键字 typeof/void/delete/new…），
//     其后的除号也会被认成正则（假阳）；
//   - `(` / `[` / `,` 之后是正则起点，却被倒数第二个单元 Bracket 挡掉（假阴）；
//   - 正则体里的 `/`（字符类 `[/]`）、`;`、括号、引号会被字符层当别的 token 处理（假阴并连带崩掉语句切分）。
// 所以下面每组都成对给出「该当正则」与「该当除号」的近邻；正则体那组专门压字符层词法。
//
// 本批范围：R1 正则基本形、R2 正则体词法、R3 正则出现在表达式位置、R4 除号（正则的对抗项）、
// R5 正则与除号相邻、R6 与表达式语法共用的边界。

// ===== R1 base：正则字面量基本形 =====
/a/;
/a/g;
/a/gi;
/a/gim;
/a/gimsuy;
/a/d;
/a/v;
/a/u;
/a/y;
/a/s;

// ===== R2 正则体词法：这些字符在字符层都不该按普通 token 处理 =====
/[a-z]+/;
/[^/]+/;
/[/]/;
/\//;
/a\/b/;
/(a|b)*/;
/^$/;
/\d+/;
/a{2,3}/;
// + 正则体里的 `;` / 括号 / 引号：一旦被当成普通 token，语句切分与括号配对都会错
/;/;
/{/;
/}/;
/\(/;
/\)/;
/\[/;
/\]/;
/"a"/;
/'a'/;
/`/;
// + 空白与反斜杠（`/ /` 是只含一个空格的正则；`//` 才是行注释）
/a b/;
/ /;
/\\/;
/[\\/]/;
/[/]?/;
/^\/$/;
/a\/\/b/;
/[//]/;

// ===== R3 base：正则出现在表达式位置（`(` / `[` / `,` / 关键字 / 运算符之后）=====
x = /a/;
x=/a/;
x = /a/g;
f(/a/);
f(/a/, 1);
f(1, /a/);
(/a/);
(/a/g);
x ? /a/ : /b/;
!/a/.test(b);
typeof /a/;
void /a/;
delete /a/;
-/a/.source;
a instanceof /b/;
a in /b/;
/a/.test(b);
/a/g.test(b);
/a/.source;
x = f(/a/);
a ? b : /c/;
x = 1 + /a/.length;
x = /a/ || /b/;
x = a ?? /b/;
x = a && /b/;
x = a === /b/;
x = !/a/;
x = (a, /b/);
f(a, (/b/));
x = 1 ? /a/ : /b/;
x = (/a/, /b/);
x = /a/ + "";
(/a/).test(b);
x = /a/ ? b : c;
x = /a/i.test(b);
x = a ? /b/ : /c/;
/a/.test(b) && /c/.test(d);
f(/a/).test(b);
typeof /a/ / b;
// + trivia：前导块注释 / 前导换行 / 字面量与后缀之间的空白、注释、换行
/* c */ /a/;
\n/a/;
\n/a/.test(b);
\nx = /a/;
x = /* c */ /a/;
/a/ /* c */;
/a/; // c
/a/ .test(b);
/a/\n.test(b);
/a/ /**/ .test(b);

// ===== R4 base：除号（正则的对抗项：这些 `/` 一个都不能进 RegexToken）=====
a / b;
a/b;
a /b;
a/ b;
a  /  b;
a\n/ b;
a /\nb;
// + 词间注释：倒数第二个单元变成 AreaAnnotation，现有判据会判成正则
a /* c */ / b;
a/ /* c */ b;
a /* c */ / /* d */ b;
a/* c *//b;
x = a /* c */ / b;
x = a / b /* c */ / d;
// + 接收者不是 Common / Bracket：字符串、非空断言、后缀自增、调用、成员、下标
"s" / b;
"s" /b;
a! /b;
a!/b;
a++ /b;
a++/b;
a--/b;
a / b / c;
a/b/c;
1 / 2;
1/2;
1 / 2 / 3;
1 / 2 / 3 / 4;
a / b * c;
a / b + c;
a * b / c;
a / b % c;
(a) / b;
(a)/b;
(a) / (b);
f() / b;
f(a) / b;
a.b / c;
a[b] / c;
new A() / b;
a / +b;
a / -b;
a / !b;
a / ~b;
a / (b + c);
a / f(b);
a / b.c;
a / b[c];
a / typeof b;
- a / b;
typeof a / b;
// + 复合赋值 `/=`：不能因为以 `/` 开头就进正则
a /= b;
a/=b;
x = a / b;
f(a / b);
(a / b);
a ? b / c : d;
x = a / b; y = c / d;
// + trivia 叠加：空白 / 注释 / 换行都不改变「除号」这个结论
(a) /* c */ / b;
1 /* c */ / 2;
a[b] /* c */ / c;
f() /* c */ / b;
a\n/b/g.test(c);
// + 可选链 / 非空断言 / 下标接收者
a?.b / c;
a!.b / c;
a?.[b] / c;

// ===== R5 正则与除号相邻：两侧都不能判错 =====
/a/ / /b/;
/a/ / /b/g;
x = /a/ / 2;
x = /a/ / b;
x = /a/ / b / c;
x = b / /a/;
x = /a/ / /b/;
/a/g / b;
a / /b/;
a / /b/g;
a / /b/.source;
a / /b/.test(c);
a /* c */ / /b/;
f(/a/, b / c);
x = a/b; y = /c/d;
f(a/b, /c/);
x = /a/; y = b / c;
x = b / c; y = /a/;
x = a ? /b/ : c / d;
x = a / b / /c/;
/a/.test(b) / c;

// ===== R6 与表达式语法共用的边界（正则只是其中一种操作数）=====
x = a / b ? c : d;
x = a ? b : c / d;
x = a / b ? /c/ : /d/;
x = a / b, c / d;
x = /a/, b / c;
x = (/a/, b / c);
f(a / b, /c/);

// ===== R7 语句边界：正则语句与除号语句相邻 / 同一文件多语句 =====
/* c *//a/;
/a/; b / c;
/a/; /b/;
a / b; /c/;
a; /b/;
a;/b/;
a;\n/b/;
a = /b/; c = d / e;
a = /b/; /c/g;
a / b; c / d;

// ===== R8 该当正则的贴近形：关键字 / 一元 / 二元与 `/` 之间没有空白 =====
typeof/a/;
void/a/;
delete/a/;
new /a/;
new/a/;
+/a/;
~/a/;
! /a/;
a+/b/;
a * /b/;
a ** /b/;
a < /b/;
a[/b/];
a[ /b/];
a[/b/g];
a = b ? /c/ : /d/;
f(a ? /b/ : c);
a?/b/:c;
a?b:/c/;
a = (/b/);
a = b = /c/;
a += /b/;
a /= /b/;
a = /* c *//b/;
f( /a/);
f(\n/a/);
x = 1 / /a/;
f(b / /c/);
a = b / /c/;
a = b / c, /d/;
/a/ + /b/;
/a/ === /b/;
/a/ instanceof RegExp;
/a/.test(/b/);
f(/a/g, /b/);
/a/ / b;
/a/g/b;
a = /b/ / c;
a = /b/ /* c */ / c;

// ===== R9 正则体与 flags 的补充词法 =====
/[\/]/;
/[(){}]/;
/\{/;
/["']/;
/a;b/;
/(?:)/;
/a/dg;
/a\\/;

// ===== R10 除号护栏（贴近形 / 复合符号 / 换行 / 前导 trivia）=====
a = b/c;
a = (b) / c;
a = b / (c);
a = b / +c;
a = "s" / b;
a = b / c / d;
f()/b;
new A()/b;
f(a /b);
a[b /c];
a/g;
a/g/i;
a/d;
a / d;
a / g;
-a / b;
!a / b;
void a / b;
delete a.b / c;
1\n/ 2;
/* c */ a / b;

// ===== 暂缓（依赖本仓尚未实现的构造，不是 regex 缺口）=====
// 歧义在语法上下文里、词法层看不到的那一族：控制头 / 裸块之后的语句位，`/` 该起正则。
//   if (a) /b/.test(c);   while (a) /b/;   {} /a/;   do /a/; while (a);
// 语句关键字之后（Return/Throw/Switch 形状还没接进 SourceFileShape 的候选表）：
//   return /a/;   throw /a/;   case /a/:   default:
// 箭头函数体 / 类字段初始化 / 模板标签：
//   const f = () => /a/;   class C { re = /a/; }   /a/`t`;
// 标签模板当标签的正则那一族（`/a/` 后面直接跟反引号）。
// 数组 / 对象字面量里出现正则、或字面量当接收者（形状层还没接数组/对象字面量，先记着）：
//   [/a/];   [/a/, /b/];   x = [ /a/ ];   [/a/][0];   [a / b];   [/a/, b / c];
//   x = { re: /a/ };   x = { a: /a/, b: /b/ };   [a] / b;   ({}) / b;

// ===== R7 chunk2：字符类 / 转义 / 标志（正则体词法）=====
/a[b-d]e/;
/a[^b]/;
/[a-z]/g;
/\d+/;
/\w/;
/[/]/;
/a\/b/;
/[(){}]/;
/[^a-z0-9_]/;
/\s+/g;

// ===== R8 chunk2：标志 —— unicode / sticky / dotAll =====
/a/u;
/a/y;
/a/s;
/a/uy;
/a/gim;

// ===== R9 chunk2：除号 vs 正则（oracle 复核：这些 `/` 该是除号）=====
a / b;
a / b / c;
/* c */ a / b;
a / b / c / d;

// ===== R10 chunk2：除号 vs 正则（oracle 复核：这些 `/` 该起正则）=====
a = /re/;
f(/re/);
a ? /x/ : /y/;
typeof /re/;
a ? /x/ : /y/ ;
/re/.test(a);

// ===== R11 chunk2：语句位 / 块内的正则（形状已接的那些）=====
if (/re/.test(a)) b;
function g() { return /re/; }
function g() { return /re/; }
return /re/;

// ===== 暂缓（chunk2 复核后仍红，原因在注释里）=====
// 数组字面量里的正则：形状层数组元素目前与除号走同一批语法，两条 oracle 结论不同，先不硬收。
// `// ` [/re/];
// 换行后的正则语句（`a\n/re/.test(b)`）：TS 侧 oracle 也是 ExpressionStatement，但本仓在
// 「换行 + `/`」处还不判「是否延续」，报「不支持的表达式起点」；属 ASI 判据的后续项。
// `// ` a\n/re/.test(b);
