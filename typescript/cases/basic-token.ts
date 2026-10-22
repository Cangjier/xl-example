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
// 4. U+FEFF（BOM）作 trivia（原 1 份 crash：`lexical/lex-bom.ts`）；
//    用户裁定②（方案②「放宽 Bom 起始判据」）：`Bom.CanStart` 只要求字符在 `Template.BomChars` 里，
//    **任意位置**都认（对齐 TS，U+FEFF 属 ECMAScript Whitespace），mid-code BOM 也已修复。
//    corpus reader 逐行 `trim()`、行首 U+FEFF 会被吞掉，所以只能写「行内 / 注释之后行首」形。
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

// ---- 场景 4：U+FEFF（BOM）作 trivia（用户裁定②：任意位置都认；Bom 起始判据已放宽）----
// reader 逐行 trim，行首 U+FEFF 会被吞；line0 形在 corpus 里也无法表达，故写「行内 / 注释之后行首」形。
/* c */﻿const b1 = 1;
/* c */\n﻿const b2 = 1;
/* c */﻿﻿const b4 = 1;
// 用户裁定②（已修复）：mid-code BOM（首个代码 token 之后）按 trivia 跳过，AST 与 TS 一致
const b5 = 1;﻿const b6 = 2;
function﻿bf() {}
const b7 = [1,﻿2];
const﻿b8 = 3;
// 仍只记录的边界：BOM+shebang 的「﻿#!…」本仓有意接受为超集，但 TS 6.0.3 报 2 条诊断、
// 且 reader trim 行首 BOM，故不写活跃行。
// ---- 场景 5：shebang `#!` 作首行 trivia（已实施 Shebang basic token；index 0 或 BOM.End+1）----
#!/usr/bin/env node\nconst sb1 = 1;
#!/usr/bin/env node\nlet sb2 = 1;
#!/usr/bin/env -S node --enable-source-maps\nconst sb4 = 1;
#!/usr/bin/env node
#!/usr/bin/env node\n// c\nconst sb5 = 1;

// ---- 场景 8–13：2026-10 探针新发现，**必须改 core、待用户裁定**（未修，故不写活跃用例）----
// 探针：clone/tmp/probe-basic-token.mjs，14 族 303 条候选（kind 归一口径同 ast-compare）；
// TS 侧只认 parseDiagnostics=0 的 236 条：207 一致 / 9 crash / 20 diff；67 条 TS 自身非法已剔除。
// 下面每条都给最小复现与 core 根因；修好后应各自转为活跃行（base/变体成对）。
// 8. lone CR 不是行注释/shebang 的行尾：`// c\rconst a = 1;`、`#!x\rconst a = 1;` → cj 整行吞到 EOF（cj 树为空）。
//    根因：core/syntax/basic-tokens/line-annotation.xl.md:124 只判 `source.Value !== "\n"`；
//    core/syntax/basic-tokens/shebang.xl.md:68 同判据。CRLF 正常（CR 先被回退），只有 lone CR 漏。
// 9. U+2028/U+2029 不是行终止符，也不是空白：`const a = 1;<LS>const b = 2;`（cj crash「表达式语句没有读完」）、
//    `function f(){ return<LS>1; }`（cj 把 `return`+LS+`1` 并成一个 Identifier）、`type T =<LS>number;`（同）。
//    根因：空白表 core/syntax/templates/symbol-template.xl.md 的 IsWhiteSpace（被 core/syntax/basic-tokens/common.xl.md:63/598
//    用于「能不能并块」）不含 LS/PS；行注释/shebang 的 `\n` 判据见 8。
// 10. U+200B（ZERO WIDTH SPACE）不是空白：`const a = 1;<U+200B>const b = 2;`、`x = 1<U+200B>+2;`
//     （TS 对这两条 0 诊断——TS 的 isWhiteSpaceSingleLine 把 0x2000–0x200B 都算空白；cj 均 crash）。
//     根因同 9 的 IsWhiteSpace 字符表（core）。
// 11. `\u{…}` 花括号转义没有位数上限：`const \u{0000061} = 1;`（TS 合法，码点 0x61；cj crash「变量声明缺少标识符」）。
//     根因：core/syntax/basic-tokens/common.xl.md:69/92/104 写死 1–6 位十六进制；TS 不限位数、只要求码点 ≤ 0x10FFFF。
//     typescript/tokens/names/identifier-shape.xl.md:47 是同一 6 位口径的解码侧，放宽时需一起改（否则 escape 进不了 token）。
// 12. 模板里非法转义的 cooked 值：`tag`+反引号+`\8`（TS 的 text 是原文 "\\8"，即 cooked=undefined 时回退 raw；
//     cj 给出 "8"）。根因：core/syntax/basic-tokens/string/translate.xl.md:37/125 把 `\8`/`\9` 按
//     NonOctalDecimalEscapeSequence「解成字符本身」，而 TS 只在无标签模板里报错、在有标签模板里保留 raw。
// 13. 已探明**无缺口**、不必再探的族（证据同上）：HTML 注释 `<!--`/`-->`（TS 与 cj 一致；TS 自身多数非法）、
//     CRLF、BOM 任意位置（除 shebang 行尾见 8/9）、`\u{…}` 常规 1–6 hex、U+200C/U+200D 标识符、
//     regex 起点上下文（控制头 `)`/else/do/`}`/=>/yield/await/case 后）、数字分隔符 30 条合法形、`$` 与 `\u0024`。
