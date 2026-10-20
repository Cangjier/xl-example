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

// ===== base 29：operator sweep —— 二元优先级阶梯（base）=====
a ** b;
a * b;
a / b;
a % b;
a + b;
a - b;
a << b;
a >> b;
a >>> b;
a < b;
a > b;
a <= b;
a >= b;
a in b;
a instanceof b;
a == b;
a != b;
a === b;
a !== b;
a & b;
a ^ b;
a | b;
a && b;
a || b;
a ?? b;
// 混合优先级
a + b * c;
a - b - c;
a < b && c > d;
a ** b ** c;
a | b ^ c & d;
a == b === c;
a << b + c;
a in b && c instanceof d;
a ?? (b || c);
(a ?? b) || c;
// + trivia
a /* c */ + b;
a +\n b;
a  +  b;
a /* c */ && b;
a /* c */ ?? b;

// ===== base 30：assignment（全族）=====
a = b;
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
a = b = c;
a += b -= c;
// + trivia
a /* c */ = /* d */ b;
a /* c */ += b;

// ===== base 31：一元 / 前缀 / 后缀（补全组合）=====
!a;
~a;
+a;
-a;
typeof a;
void a;
delete a.b;
++a;
--a;
a++;
a--;
!a && ~b;
-a * +b;
typeof a.b;
delete a[b];
+a + -b;
~a ^ !b;
typeof ++a;
void a++;
// + trivia
! /* c */ a;
- /* c */ a;
typeof\na;
a /* c */ ++;
++ /* c */ a;

// ===== base 32：可选链 / 非空 / 逗号 / 三元（补全）=====
a?.b?.(c);
a?.b?.[c];
a!.b;
a!;
a?.b!.c;
a, b;
a, b, c;
a ? b : c;
a ? b : c ? d : e;
a = b, c = d;

// ===== 暂缓（operator sweep 中 builder 尚不支持的写法）=====
// 调用 / 数组里的 spread     f(...a);   [...a];   f(...a, b);   [a, ...b];
//   ← ExpressionBuilder 的 ParseBracketArguments / ParseArrayLiteral 不吃 `...`
//     （对象字面量里的 SpreadAssignment 已支持，见 expression-builder 的 ParseObjectLiteral）
// await / yield              await a;   function* f() { yield 1; }
//   ← CanStart / 语句候选与 builder 都还没有 AwaitExpression / YieldExpression
// new.target / import.meta   ← MetaProperty 尚未实现（import 候选侧另见 docs/expression-ast-analysis.md）

// ===== base 29：参数绑定模式 / 默认值 / 可选 / 泛型箭头 =====
// a) 解构参数（箭头）：Parameter 的第一个 child 是 ObjectBindingPattern / ArrayBindingPattern
({ a }) => a;
({ a, b }) => a;
([a, b]) => a;
({ a: c }) => c;
({ a = 1 }) => a;
([a = 1]) => a;
({ a, ...rest }) => rest;
([...rest]) => rest;
// b) 函数表达式里的解构参数
(function ({ a }) { return a; });
(function ([a, b]) { return a; });
(function ({ a = 1 }) { return a; });
(function ({ a }: A) { return a; });
// c) 泛型箭头：TypeParameter 在 Parameter 之前
<T>(a: T) => a;
<T, U>(a: T, b: U) => a;
// d) 默认值 / 可选参数
(a = 1) => a;
(a?: A) => a;
(a, b = 2) => b;
// e) trivia
( { a } ) => a;
({ /* c */ a }) => a;
({ a /* c */ }) => a;
([ /* c */ a, b ]) => a;
({ a, /* c */ b }) => a;
({ a, b = 1 }) => a;
({ a: c = 1 }) => c;
<T, U>(a: T, /* c */ b: U) => a;

// ===== 测量 sweep：satisfies / as const =====
a satisfies T;
a satisfies T;
(a) satisfies T;
({ a: 1 }) as const;
[1, 2] as const;
f({} as const);
x = a satisfies T;
a /* c */ satisfies T;
a satisfies /* c */ T;
({ a: 1 } /* c */) as const;

// ===== 测量 sweep：暂缓（注释目标 + 原因）=====
// `a as const`：TS 语义错误（const 断言只许用在字面量/数组/对象上），oracle 侧只报诊断，
//   本 sweep 不收语义非法形态。
// `satisfies` 链式（`a satisfies T satisfies U`）：TS 解析为嵌套 SatisfiesExpression，
//   本仓 ParseBinary 的 satisfies 分支是否吃两层待后续 sweep 确认。
// ===== base 30：private-in（brand check）=====
// 注意：裸 `#x in obj;`（语句首）当前被 statements 家族的 ExpressionStatementPossibleShape.CanStart
// 拒绝（CanStart 的 Symbol 白名单没有 `#`，且该文件不在本块写范围），所以语句首用括号 / 赋值 / 逻辑组合测量：
(#x in obj);
a && #x in a;
a || #x in a;
!(#x in a);
x = #x in obj;
(/* c */ #x in obj);
(#x /* c */ in obj);
(#x in /* c */ obj);
(a && /* c */ #x in a);
// + class 方法里的 #x（class members + expression builder 配合）
class C { #x = 1; m() { return #x in this; } }
class C { #x = 1; m() { return #x in this && a; } }
class C { #x = 1; m() { return !(#x in this); } }
class D { #a = 1; #b = 2; m() { return #a in this && #b in this; } }
// 暂缓：语句首裸 `#x in obj;`（依赖 statements 的 CanStart 放行 `#`）；class 外的私有标识符单独使用 /
// private method reference（TS 语义错误或尚未实现）
// ===== base 33：模板字面量 / 逻辑链 / super / new.target（measurement sweep）=====
// 模板：无替换 / 单替换 / 多替换 / 嵌套 / tagged
`a`;
`a${b}c`;
`${a}${b}`;
`a${`b${c}`}d`;
tag`a${b}`;
tag`x`;
tag`${a}`;
`a${ /* c */ b}c`;
tag /* c */ `a${b}`;
`a${b /* c */}c`;
tag\n`x`;
// 逻辑链（`a ?? b` 已在 base 14）
a ?? b ?? c;
a ?? b ?? c ?? d;
// class 上下文：new.target 已可测；super 暂缓（builder 的 ParsePrimary 把 `super` 当 Identifier，
// 没有 SuperKeyword 产生式 —— 属 expression-builder 改动，本 sweep 是 measurement-only，先记目标）
class C { m() { return new.target; } }
// class C extends B { m() { super.m(); } }        ← 需要 SuperKeywordShape 分派
// class C extends B { m() { return super.a; } }   ← 同上
// `super()` 构造器调用 / `super` 在非 class 上下文 ← TS 语义非法，本 sweep 不收
// `new.target` 若 builder 的 ParseNew/MetaProperty 未接，则本 base 的对应行会在 diff 里显形，按实测调整
// ===== base 34：super 关键字（class 体内；TS kind = SuperKeyword）=====
class C extends B { m() { return super.m(); } }
class C extends B { m() { super.m(a); } }
class C extends B { get x() { return super.x; } }
class C extends B { constructor() { super(); } }
class C extends B { constructor(a) { super(a); } }
class C extends B { m() { return super.m().n; } }
class C extends B { m() { return super.a.b; } }
class C extends B { m() { return super["m"]; } }
// + trivia：super 与 `.` / `(` 之间注释
class C extends B { m() { return super /* c */ . m(); } }
class C extends B { m() { return super. /* c */ m(); } }
class C extends B { constructor() { super /* c */ (); } }
// 暂缓：class 外的 `super`（TS 语义错误）；object method 里的 `super`（语义依赖 home object，暂不收）
// ===== statement-start private brand check（private-in 合入主线后；CanStart 放行 Symbol "#"）=====
#x in obj;
/* c */ #x in obj;
#x in obj; // tail
#x /* c */ in obj;
#x in obj;\n#y in obj;
function f() { #x in obj; }
function f() { return #x in obj; }
class C { m() { return #x in this; } }
class C { m() { #x in this; } }
// 红：private 成员访问 `this.#x` / `this.#m()` —— ExpressionBuilder 的 `.` 成员分派不认 `#`+名字
// （属 expressions 家族后续；本块只放行语句首 `#`，不改 expressions 源）
// class C { #x = 1; m() { return this.#x; } }
// class C { #m() {} m2() { return this.#m(); } }
// ===== base 35：private 成员访问（this.#x / this.#m()）=====
class C { #x = 1; m() { return this.#x; } }
class C { #x = 1; m() { this.#x = 2; } }
class C { #x = 1; m() { return this.#x + 1; } }
class C { #m() {} m2() { return this.#m(); } }
class C { #m(a) {} m2() { return this.#m(1); } }
class C { #m() {} m2() { return this.#m().n; } }
class C { static #x = 1; static m() { return C.#x; } }
// + trivia：`.` 两侧 / private 名后注释
class C { #x = 1; m() { return this /* c */ . #x; } }
class C { #x = 1; m() { return this. /* c */ #x; } }
class C { #m() {} m2() { return this.#m /* c */ (); } }
// class 外（parse-legal，语义错误由 ts 语义检查报；AST 对拍只看语法）
obj.#x;
// 暂缓：optional private access `obj?.#x`（TS 语法允许但本块未接 `?.` 的 private 分支）、
// brand check `#x in obj` 已由 base 30 覆盖