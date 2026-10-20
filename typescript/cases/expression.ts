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

// ===== base 21：箭头函数（表达式体；参数只收标识符）=====
() => 1;
(a) => a;
(a, b) => a;
a => a;
(a) => ({ x: a });
a => a + b;
(a) => (a);
(a) => a ? b : c;
x = (a) => a;
f((a) => a);
(a, b) => a + b;
// + trivia：前导 / 词间 / 行尾 / 换行 / 多空格
/* c */ (a) => a;
(a) => a /* c */;
a /* c */ => a;
(a, /* c */ b) => a;
(\na\n) => a;
( a ) => a;
a  =>  a;
a\n=>\na;
(a) => a; // c

// ===== base 22：类表达式（空类体）=====
(class {});
( class {} );
/* c */ (class {});

// ===== base 23：as / satisfies（右操作数交给 TypeBuilder.ParseType）=====
a as T;
a satisfies T;
a as A<B>;
a as A[];
a as (A | B);
a as A & B;
a as "s";
a satisfies A<B>;
a as T as U;
a + b as T;
a as T + b;
x = a as T;
f(a as T);
f(a as T, b as U);
({ a: b as T });
[a as T];
a ? b as T : c;
// + trivia：前导 / 词间 / 类型前 / 类型后注释、换行、多语句
/* c */ a as T;
a /* c */ as T;
a as /* c */ T;
a as T /* c */;
a satisfies /* c */ T;
f(a as /* c */ T);
({\na as T\n});

// ===== base 24：泛型实参调用（`<` 配对的 `>` 后随 `(` 才走泛型，否则回退二元比较）=====
f<T>(a);
f<T, U>(a, b);
f<T>();
f<T>(a).b;
f<T<U> >(a);
x = f<T>(a);
a.b<T>(c);
f < g > (a);
// + 回退（不能把比较吃成泛型调用）
a < b;
a < b > c;
f(a < b);
a <b;
a< b;
// + trivia：`<` 前 / 实参前 / 实参后注释
f /* c */ <T>(a);
f< /* c */ T>(a);
f<T /* c */>(a);
f<T>(/* c */ a);

// ===== base 25：块体箭头（children = Parameters、=>、Block）=====
() => {};
(a) => { return a; };
(a) => { let x = 1; };
(a) => { let x = 1; return x; };
(a) => { { } };
(a) => { { let x = 1; } };
(a) => { if (a) { return a; } };
(a, b) => { return a; };
(a) => { return a + b; };
f(() => {});
x = () => {};
(() => {})();
// + trivia：`=>` 后 / 块内注释、换行、前导注释
(a) => /* c */ { return a; };
() =>\n{};
/* c */ (a) => { return a; };
(a) => { /* c */ return a; };
(a) => { return /* c */ a; };

// ===== base 26：函数表达式（children = name?、Parameter 们、Block）=====
(function () {});
(function f() {});
(function f(a) { return a; });
(function () { let x = 1; });
(function (a, b) {});
(function (a: T) {});
(function f(a: T) { return a; });
(function () { return 1; });
f(function () {});
({ a: function () {} });
x = function () {};
x = [function () {}];
(function () {})();
// + trivia
(function /* c */ () {});
(function f /* c */ () {});
(function (/* c */ a) {});
(function () /* c */ {});
/* c */ (function () {});

// ===== base 27：箭头参数：类型标注 / 默认值 / rest / 混合 =====
(a: A) => a;
(a: A, b: B) => a;
(a = 1) => a;
(a, b = 2) => a;
(...a) => a;
(a, ...b) => a;
(a: A, b = 1, ...c) => a;
(...a: A[]) => a;
(a = b + c) => a;
(a: A) => { return a; };
(a = 1) => { return a; };
(...a) => { return a; };
// + trivia：名后 / 类型后 / 等号两侧 / `...` 后注释、换行
(a /* c */ : A) => a;
(a : A /* c */) => a;
(a /* c */ = 1) => a;
(a = /* c */ 1) => a;
(... /* c */ a) => a;
(a,\n...b) => a;

// ===== base 28：函数表达式参数：默认值 / rest / 可选 / 混合 =====
(function (a = 1) {});
(function (a, b = 2) {});
(function (...a) {});
(function (a, ...b) {});
(function (a?) {});
(function (a?, b: B) {});
(function (a: A, b = 1, ...c) { return a; });
(function (a = f(b)) {});
(function (...a: A[]) {});
(function (a, b = 2, c) {});
// + trivia
(function (/* c */ a = 1) {});
(function (a = /* c */ 1) {});
(function (... /* c */ a) {});
(function (a /* c */) {});
(function (a: /* c */ A) {});

// ===== 暂缓（不在这张用例集里）=====
// 箭头 / 函数表达式参数：base 27/28 收类型标注、默认值、rest、可选（`?` 只对函数表达式合法）；
//   async 箭头                  async (a) => a;   async () => {};   ← 依赖 cover-end-1：CanStart 放行 async
//   解构参数 / 参数装饰器        (function ({ a }) {})   ← 依赖 bindings / decorator 家族
// 泛型调用：base 24 已收 `f<T>(a)` / `f<T, U>(a, b)` / `f<T<U> >(a)`；仍暂缓：
//   泛型箭头 / 尖括号断言        <T>(a) => a;   <T>a;   ← 依赖 cover-end-1 的 CanStart 放行 `<`
//   `f<T<U>>(a)`                连写的 `>>` 是单个组合 Symbol，要拆它属 basic token 用户决策项
// as / satisfies：base 23 已收；类型体系本身（函数类型 / 映射类型 / 条件类型等）随 types 家族继续
// 限定类型名                  a as A.B;   a as A.B.C;   ← 与 types.ts 同口径：TS 反查名是 FirstNode，
//                              ast-json.mjs 缺 ["FirstNode","QualifiedName"] 别名（harness 缺口，不是 shape 缺口）
// 类表达式：base 22 只收空类体；带类体成员的 class 表达式 ← 依赖 members/statements 家族的成员形状
// 数组 / 对象字面量             [a, b];   ({ a: b });   ← 语句首的 { } 与块歧义
// 模板 / 标签模板               `t`;   tag`t`;
// 正则 / bigint               /a/;   1n;              ← 正则单独立表：regex.ts（改造方案见 docs/regex-token-analysis.md）
// await / yield / new.target / import.meta
// ASI / 多语句边界              a\n+b;   a\n++b;   （换行是否断句单独一轮，本批只收“换行后仍可延续”的写法）
// 以下是本批想收、但当前收不进来的写法（原因在箭头后）：
// 正则字面量                  /a/;   /a/g;             ← RegexToken.Transit 被 ts 模板 Ban（a / b 会被误判）；用例见 regex.ts
// 指数带符号 / 数字分隔符 / 前导点  1e-3;   1_000;   .5;    ← 已支持，用例迁到 number.ts（basic token 会把它们收进同一个 Common）
// 字符串里的 \u / \x 转义      "\u0041";   "\x41";       ← String basic token 不解码这两种转义
// 字符串里的 \n 转义           "a\nb";                 ← 用例生成器把行内 \n 还原成真换行，写不进用例
// 空串                      "";                     ← 投影已能输出 text==""，加进用例即可（本轮沿用原计数）
// 模板串                      `t`;                     ← 会被当成 StringLiteral，kind 不对；bigint（1n）已支持，见 number.ts
