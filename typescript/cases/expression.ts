// expression 用例集：每条以 base 起，再叠加对抗信息（空白 / 注释 / 换行 / 重复形）。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成真实换行（这样多行语句也能逐行对齐）。
// 生成器会 trim 每行，行首空格构不成前导 trivia —— 前导 trivia 用 /* c */ 或 \n 叠加。
// 本批范围：E1 原子与后缀链、E2 一元与二元优先级、E3 三元 / 赋值 / 逗号。
// 暂缓（不在这张用例集里）的构造见文件末尾注释。

// ===== base 1：原子表达式 =====
a;
1;
1.5;
0x1f;
// + 数字字面量的其它写法：text 按 ts 口径规范化（0x1f → "31"、1e3 → "1000"、0b101 → "5"）
0X1F;
1e3;
1E3;
1.5e2;
0b101;
0o17;
1.;
0.5;
12345678901234567890;
"s";
's';
// + 字符串转义（用例生成器只把行内 \n 还原成换行，其余转义原样保留）
"a\\b";
"a\"b";
'a\'b';
"a\tb";
"\0";
true;
false;
null;
this;
// + 前导块注释
/* c */ a;
// + 前导换行
\na;
// + 行尾块注释
a /* c */;
// + 行尾注释
a; // c

// ===== base 2：括号 =====
(a);
(1);
((a));
(a).b;
(f)();
(a /* c */);
/* c */ (a);
(a, b).c;

// ===== base 3：属性访问 =====
a.b;
a.b.c;
a.b.c.d;
a . b;
a\n.b;
a /* c */ . b;
a.b /* c */ . c;
// + 属性名可以是关键字（IdentifierName）
a.if;
a.true;

// ===== base 4：元素访问 =====
a[0];
a[b];
a[b][c];
a[b][c][d];
a[ b ];
a[\nb];
a\n[b];
a /* c */ [b];
a[1 + 2];
a[0x1f];
a["s"];
a[b / c];

// ===== base 5：调用 =====
f();
f(a);
f(a, b);
f(a, b, c);
f()();
f(a)(b);
f(a).b;
f(a)[b];
f(/* c */ a);
f(a /* c */, b);
f(\na,\nb,\n);
f\n(a);
f?.();
f?.(a);
f(1, 2);
f(a, (b, c));

// ===== base 6：new =====
new A();
new A;
new A(1);
new A(1, 2);
new a.B();
new a.B(1);
new (f());
new A().b;
new A(1).b.c;
new A()[0].b;
new A(0x1f, 1e3);
new new A()();
new (a.b)();

// ===== base 7：非空断言 / 可选链 =====
a!;
a!.b;
a!();
a?.[b];
a?.b;
a?.b.c;
a?.b?.c;
a?.b![c];
a?.b?.(c);
a?.b!.c;
a!?.b;
a?.b!();
a[b]!();
a?.b?.[c];
a?.[b]![c];

// ===== base 8：后缀链的组合形（重复形）=====
a.b(c)[d]!.e;
a[b].c(d).e;
a.b.c.d.e.f;
f(a)(b)(c);
a?.b.c?.d;
new A().b(c);
a.b().c;
f()(a)[b].c;

// ===== base 9：前缀一元 =====
!a;
-a;
+a;
~a;
typeof a;
void a;
delete a.b;
!!a;
- -a;
void 0;
typeof a === "s";
// + 词间注释 / 换行
! /* c */ a;
typeof\na;
// + 前缀叠加 / delete 的几种操作数
- - -a;
!!a!;
delete a;
delete a[b].c;
typeof typeof a;
void void 0;

// ===== base 10：后缀一元 =====
a++;
a--;
++a;
--a;

// ===== base 11：二元：算术与优先级 =====
a + b;
a - b;
a * b;
a / b;
a % b;
a ** b;
a + b * c;
a * b + c;
a - b - c;
a + b + c;
a / b * c;
a ** b ** c;
a + b + c + d;
// + 词间注释 / 换行 / 多空格 / 行尾注释
a /* c */ + b;
a + /* c */ b;
a +\nb;
a   +   b;
a + b; // c
// + 除号两侧空白 / 括号内 / 连续除法（正则跳转 Ban 的动机：空白或注释会诱使 `/` 被当正则起点）
a/b;
a /b;
a/ b;
a / b / c;
a/b*c;
a /* c */ / b;
1 / 2;
a.b / c;
f() / b;
(a) / b;
a / b + c;

// ===== base 12：二元：关系 / 相等 =====
a < b;
a > b;
a <= b;
a >= b;
a == b;
a != b;
a === b;
a !== b;
a < b == c;
a === b === c;
a === b !== c;
a instanceof B;
a in b;

// ===== base 13：二元：位运算 / 移位 =====
a & b;
a | b;
a ^ b;
a << b;
a >> b;
a >>> b;
a & b | c;
a | b ^ c;
a + b << c;
a << b << c;
a >>> b >>> c;
a & b ^ c | d;

// ===== base 14：二元：逻辑 / 空值合并 =====
a && b;
a || b;
a ?? b;
a && b || c;
a || b && c;
a ?? (b || c);
(a ?? b) || c;

// ===== base 15：一元与二元的结合 =====
-a * b;
!a && b;
typeof a === "s";
a + b * c - d / e;
a << b + c;

// ===== base 16：三元 =====
a ? b : c;
a ? b : c ? d : e;
a + b ? c : d;
a ? b + c : d * e;
a ? b : c + d;
f(a ? b : c);
a /* c */ ? b : c;
a ? /* c */ b : c;
a ? b = c : d;
a ? (b, c) : d;
a ? b : (c, d);
a ? b : c, d;
(a, b) ? c : d;

// ===== base 17：赋值（TS 里也是 BinaryExpression）=====
a = b;
a = b = c;
a.b = c;
a[b] = c;
a += b;
a -= b;
a *= b;
a /= b;
a %= b;
a **= b;
a <<= b;
a >>= b;
a >>>= b;
a &= b;
a |= b;
a ^= b;
a &&= b;
a ||= b;
a ??= b;
a = b ? c : d;
a = b = c = d;
a += b += c;
a/=b;
a/= b;

// ===== base 18：逗号表达式 =====
a, b;
a, b, c;
a = b, c = d;
(a, b);
f((a, b));
f(a, (b, c));

// ===== base 19：混合优先级 / 嵌套 =====
a * b + c * d;
a + b < c + d;
a && b || c && d;
a = b + c * d;
a ? b : c = d;
f(a + b);
a[b + c];
(a + b) * c;
f(a ? b : c);
a ? f(b) : g(c);
a.b(c + d)[e];
a ** -b;
a++ + ++b;

// ===== base 20：同一文件多条语句（重复形）=====
a; b;
a;b;
a; b; c;
a; b; c; d;
a; /* c */ b;
a; /* c */ b; /* d */ c;
a; // c\nb;
\na;\nb;
1; 2;
f(a); b;
a = 1; b = 2;

// ===== 暂缓（不在这张用例集里）=====
// 箭头函数 / async 箭头        (a) => a;   (a, b) => a;   async (a) => a;
// 泛型调用 / 泛型箭头 / 尖括号断言  f<T>(a);   <T>(a) => a;   <T>a;
// as / satisfies              a as T;   a satisfies T;   f(a as T);
// 函数 / 类表达式               (function () {});   (class {});
// 数组 / 对象字面量             [a, b];   ({ a: b });   ← 语句首的 { } 与块歧义
// 模板 / 标签模板               `t`;   tag`t`;
// 正则 / bigint               /a/;   1n;
// await / yield / new.target / import.meta
// ASI / 多语句边界              a\n+b;   a\n++b;   （换行是否断句单独一轮，本批只收“换行后仍可延续”的写法）
// 以下是本批想收、但当前收不进来的写法（原因在箭头后）：
// 正则字面量                  /a/;   /a/g;             ← RegexToken.Transit 被 ts 模板 Ban（a / b 会被误判），恢复跳转并补形状前收不了
// 指数带符号 / 数字分隔符 / 前导点  1e-3;   1_000;   .5;    ← basic token 在符号处断开（1e-3 被拆成 1e - 3）
// 字符串里的 \u / \x 转义      "\u0041";   "\x41";       ← String basic token 不解码这两种转义
// 字符串里的 \n 转义           "a\nb";                 ← 用例生成器把行内 \n 还原成真换行，写不进用例
// 空串                      "";                     ← ast-json 投影把 text=="" 当作“没有文本”（TS 记 ""）
// 模板串 / bigint              `t`;   1n;              ← 会被当成 StringLiteral / NumericLiteral，kind 不对
