// §6「basic token 存在问题」：字符 → token 的归类由 basic token 层决定，只能由用户裁定
// （IMPORTANCE §3.1）。本文件是该大类的**覆盖标准**：每个历史失败场景都有一条活跃用例钉住，
// 当前口径下全部 PASS（cj-fail=0、AST 全一致）；仍是口径项、或 corpus 表达不了的形态只写注释。
//
// 场景与现状（详细证据见 docs/token-ast-analysis.md §3.1/§4.4/§5/§6.5 与 docs/basic-token-scenarios.md）：
// 1. 控制头 `)` 之后 / 语句起点后的 `/` 判 RegexToken（原 2 份 crash：
//    `expressions/expr-r1233-control-head-regex.ts`、`statements/stmt-if-body-regex-not-comment.ts`）；
//    已实施 Plan A（`RegexTemplate.CanStartAt` + ts 模板覆写）。守卫：普通 `)`/成员调用之后的 `/` 仍是除号。
// 2. `$` 作标识符字符（原 3 份 crash：`lexical/lex-ident-dollar-*.ts`）；已实施——从 core 符号表删除
//    `case "$":`，`$` 归 Common。`$"…"` 内插前缀在 TS 里本就不支持（ts 模板 HasInterpolationPrefix=false），
//    只作反例注释；字符串/正则/模板里的 `$` 按原义保留。
// 3. `\uXXXX` 转义标识符（原 2 份 crash：`lexical/lex-unicode-escape-identifier.ts`、`lexical/lx-unicode-ident.ts`）；
//    已实施——token 层把合法转义并进 Common，IdentifierShape 解码进 EscapedText（原文区间不变）；
//    另含 `\u{…}` 花括号形（1–6 hex、码点 ≤ 0x10FFFF，round 21–26 收口）。
// 4. U+FEFF（BOM）作 trivia（原 1 份 crash：`lexical/lex-bom.ts`，BOM 在注释之后的代码行行首）；
//    已实施方案 (b)：`Bom.CanStart` = index 0 或前面只有 trivia（尚无代码 token）。
//    corpus reader 逐行 `trim()`、行首 U+FEFF 会被吞掉，所以只能写「行内 / 注释之后行首」形；
//    mid-code BOM（首个代码 token 之后）仍**有意不支持**，见文件末尾注释。
// 5. shebang `#!` 作首行 trivia（原 2 份 crash：`lexical/lex-shebang.ts`、`lexical/lx-shebang.ts`）；
//    已实施 basic token `Shebang`：起点 index 0 或 `Bom.SourceRange.End.Index + 1`，吞到行尾 `\n` 前、不进 AST。
// 6. `>>` / `>>>` 的 token 层口径：**保持合符号不拆**（`AllowCombineSymbol`），types 侧 `IsSplitClose`、
//    expression 侧 `MatchAngleClose` 已在类型位/表达式位绕过；原 types G2（`expressions/ex-angle-cast.ts`）已转 PASS。
// 7. 上下文关键字（`async` 等）升级留在 parser 侧：`async` 换行/带注释时按 Identifier（与 TS 一致）。
//
// 写法约定：一个物理行=一个用例；行内两字符 `\n` 表示真换行（字符串/模板/正则/注释里按原义保留）；
// 行首会被 reader `trim()`，不能依赖空白/BOM/U+FEFF。顺序：各场景 base 用例在前，
// trivia（BOM / shebang）与重复/形变体在后。

// ---- 场景 1：控制头 `)` 之后 / 语句起点后的 `/` 判正则（已实施 Plan A）----
// base：`(` 之后本来就是正则；普通表达式里的 `/` 本来就是除号（改前的对照）
if (/x/) {}
const a = b / c;
const r = /x/;
// 控制头 `)` 之后：if / while / for(;;) / for-of / for-in / do-while 尾 / catch 体 / finally 体 / else
if (a) /re/g;
while (a) /re/g;
for (;;) /re/g;
for (const x of y) /re/g;
for (const k in o) /re/g;
do { } while (a) /re/g;
do /re/g; while (a);
try { } catch (e) { } /re/g;
try { } finally { } /re/g;
if (a) b(); else /re/g;
if (a) { } else /re/g;
switch (a) { case 1: /re/g; }
// 嵌套：function 体 / class 体里的 if 体
function f() { if (a) /re/.test(x); }
class C { m() { if (a) /re/.test(x); } }
// 控制头 `)` 与 `/` 之间有 trivia / 换行；语句起点（标签后）
if (a) /* c */ /re/g;
while (a)\n/re/g;
l: /re/g;
// 守卫：这些 `/` 仍是除号（判据不能扩到普通 `)` 之后 / 成员调用 / 后缀运算之后）
const g1 = (a)\n/re/g;
const g2 = obj.while(a)\n/re/g;
const g3 = a / b;
const g4 = a /* c */ / b;
const g5 = f(a) / 2;
const g6 = (a + b) / 2;
const g7 = a++ / 2;
const g8 = obj.m() / 2;
const g9 = new C() / 2;
const g10 = a\n/ 2;
while (a / b) {}
if (a / b) {}

// ---- 场景 2：`$` 作标识符字符（已实施：core 符号表移除 `$`，归 Common）----
const de1 = $x;
const de2 = a$b;
const $$ = 1;
interface I$X { a: number }
$();
class D$ { $m() { return $; } }
const de3 = { $x: 1 };
const $ = 1;\nconst q = { $ };
$l: for (;;) break $l;
// 反例守卫：`$` 在字符串 / 正则 / 模板里按原义保留，内插前缀不回归
// （`$"…"` 是 TS 非法形态、本仓也不支持，只作注释，不写活跃行）
const ds1 = "$x";
const ds2 = /$/;
const dt1 = `$x`;

// ---- 场景 3：`\uXXXX` 转义标识符（已实施：token 并成 Common，AST text 用解码值、原文区间不变）----
const ue1 = \u0061bc;
const ue2 = a\u0062c;
function f\u0066() {}
class C\u0031 {}
interface I\u0041 { a: number }
const ue3 = { \u0061: 1 };
class E { \u0061() {} }
const ue4 = obj.\u0061;
let ue5: \u0049;
function h(\u0061rg: number) { return \u0061rg; }
// 场景 3b：`\u{…}` 花括号形（1–6 hex、码点 ≤ 0x10FFFF），标识符位 / 属性名位 / 方法名位 / 类型位
const ub1 = \u{61}bc;
const ub2 = a\u{62}c;
function f\u{66}() {}
class C\u{31} {}
interface I\u{41} { a: number }
const ub3 = { \u{61}: 1 };
const ub4 = \u{61}\u{62};
const ub5 = { a: \u{62} };
class F { \u{62}() {} }
const ub6 = obj.\u{62};
let ub7: \u{49};

// ---- 场景 6：`>>` / `>>>` 在类型位与表达式位的收尾（token 层保持合符号）----
// 类型位：angle-cast（历史 types G2 文件）、嵌套泛型（`>>` / `>>>` 收尾）
const d = <Array<number>>y;
const t2: Array<Array<number>> = [];
const t3: Map<string, Array<Set<number>>> = new Map();
f<Array<number>>(x);
new Map<string, Array<number>>();
// 表达式位：移位 / 复合赋值
const v3 = a >> b;
const v4 = a >>> b;
a >>= b;
a >>>= b;
// 守卫：单个 `>` 比较不受影响
const c1 = a > b;

// ---- 场景 7：上下文关键字升级口径（`async` 等留在 parser 侧，与 TS 一致）----
async function f1() {}
const f2 = async () => 1;
async\nfunction f3() {}
const async = 1;

// ---- 场景 4：U+FEFF（BOM）作 trivia（已实施方案 (b)：index 0 或前面只有 trivia）----
// reader 逐行 trim，行首 U+FEFF 会被吞；line0 形在 corpus 里也无法表达，故写「行内 / 注释之后行首」形。
/* c */﻿const b1 = 1;
/* c */\n﻿const b2 = 1;
/* c */﻿﻿const b4 = 1;
// 有意不支持（不写活跃行）：mid-code BOM —— `const b = 1;﻿const c = 2;`（首个代码 token 之后）仍 crash；
// BOM+shebang 的 `﻿#!…` 本仓有意接受为超集，但 TS 6.0.3 报 2 条诊断、且 reader trim 行首 BOM，故只记录。

// ---- 场景 5：shebang `#!` 作首行 trivia（已实施 Shebang basic token；index 0 或 BOM.End+1）----
#!/usr/bin/env node\nconst sb1 = 1;
#!/usr/bin/env node\nlet sb2 = 1;
#!/usr/bin/env -S node --enable-source-maps\nconst sb4 = 1;
#!/usr/bin/env node
#!/usr/bin/env node\n// c\nconst sb5 = 1;
