// §6「basic token 存在问题」：字符 → token 的归类由 basic token 层决定，只能由用户裁定
// （IMPORTANCE §3.1）。本文件因此**只放注释 + 已 PASS 的边界对照**，不写任何会红的活跃行。
//
// 待用户裁定清单（详细证据见 docs/token-ast-analysis.md §5）：
// 1. 控制头 `)` 之后 `/`：`/` 现被判成 `Symbol("/")`（除号），语句起点以 `/` 开头时抛
//    「不支持的表达式起点」（`expr-r1233-control-head-regex`、statements M 组 1 份）。
//    边界对照：`(` 之后的 `/` 已能判成正则（见下方 if (/x/) 一行）。
// 2. `$` 作标识符字符：**已实施**——用户指定从 core 符号表删除 `case "$":`（非 Ban）；`$` 归 Common，
//    `$"…"` 内插前缀在 ts 模板 HasInterpolationPrefix=false，无依赖。
// 3. `\uXXXX` 转义标识符：**已实施**（4 位形）—— token 层把合法的 `\u`+4hex 并进 Common，
//    IdentifierShape 解码进 EscapedText（原文区间不变）；`\u{…}` 花括号形仍缺。
// 4. U+FEFF（BOM）算 trivia：`Common` 会把 `\uFEFFconst` 吞成一个词（1 份，lex-bom，BOM 在中间行行首）。
// 5. shebang `#!` 作首行 trivia：`#` 一律按 PrivateIdentifier 前缀扫，`!` 另起单元；
//    `ShebangTriviaShape` 已存在但 possible/build 仍是「未实现」桩（2 份，lex-shebang / lx-shebang）。
// 6. `>>` / `>>>` 是否在 token 层拆成单个 `>`：token 层不拆，typescript 层已在类型位/表达式位绕过
//    （1 份，types G2；拆不拆影响所有泛型收尾与右移运算符，属口径决定）。
// 7. （附带）Keyword 升级表：`async` 等上下文关键字的升级判据是否下放到 token 层，同样交用户。
//
// 以下活跃行都已是当前口径下 PASS 的边界对照，用来钉住「`/` 在可判位置仍是正则/除号」：
if (/x/) {}
const r = /x/;
const a = b / c;
// 场景 1（已实施 Plan A）：控制头 `)` 之后 / 语句起点的 `/` 判成正则
while (a) /re/g;
if (a) /re/g;
for (;;) /re/g;
do { } while (a) /re/g;
try { } catch (e) { } /re/g;
function f() { if (a) /re/.test(x); }
class C { m() { if (a) /re/.test(x); } }
// 守卫：这些 `/` 仍是除号
const g1 = (a)\n/re/g;
const g2 = obj.while(a)\n/re/g;
const g3 = a / b;
const g4 = a /* c */ / b;
// 场景 3（已实施）：\uXXXX 转义标识符——token 层并成一个标识符，AST text 用解码值（原文区间不变）
const ue1 = \u0061bc;
const ue2 = a\u0062c;
function f\u0066() {}
class C\u0031 {}
interface I\u0041 { a: number }
const ue3 = { \u0061: 1 };
// 场景 2（已实施）：`$` 作标识符字符（core 符号表直接移除 `$`）
const de1 = $x;
const de2 = a$b;
interface I$X { a: number }
$();
const de3 = { $x: 1 };
