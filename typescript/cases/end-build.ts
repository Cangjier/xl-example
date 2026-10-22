// §6「end build 不对」：close 时取 End 的单元取错（零宽节点落点 / 尾随注释尾巴）。
// 覆盖组：D9 —— `throw` 无参数恢复出的零宽 Identifier 落点、type-tail 行注释之后不得把下一行续进类型。
// 来源：token-repros 与 statements/stmt-throw-no-argument-then-statement、types/type-tail-linecomment 的修复。
//
// 状态（本分支复核，原先那句「两条都是剩余 diff、不写成活跃行」已过时）：
//   · `type T = A // c\n[];`：TS parseDiagnostics=0，本仓 AST 与 TS 完全一致——TypeAliasDeclaration.End
//     停在 `A`（[0,10)），`[]` 是独立的 ExpressionStatement；**已写成活跃行**（见 ④ 组第二条）；
//   · `throw\n;`：仍是真缺口（TS parseDiagnostics=0 而非 1，本仓 CRASH），只写注释+证据，见文件末尾「仍缺口」；
//   · 本轮另实测出第二个缺口 `function f(){ return\n; }`（`;` 该被 return 当终止符吞掉），同写注释+证据。
// 其余为本轮补的 End 边界：`throw`/`return` 受限产生式换行、零宽 Identifier / OmittedExpression 的落点、
// 行注释与块注释尾巴不进区间、声明/语句的 End 与下一行语句边界。
// 一行一个用例，行内 `\n` 由 ast-json.mjs 还原（行尾 `//` 注释里的 `\n` 也还原，故多行形可写在一行）。

// ── ① throw 语句的 End：分号 / 行注释 / 块注释 / EOF / 下一句边界（尾部 trivia 不进区间） ──
throw e;
throw e\n;
throw e // c\n;
throw e; // c
throw e // c
throw e /* c */;
throw e; // c\nfoo;
// 受限产生式：`throw` 之后的换行仍可接表达式（TS diag=0），End 停在表达式末尾
throw\nx;
throw // c\ne;
// 块体里同一口径（根级与块体必须同一时机）
function f(){ throw e // c\n; }

// ── ② throw 无参数：零宽恢复 Identifier 的落点（pos=end，落在下一格而不撑大语句 End） ──
// `function f(){ throw\n}` —— TS 造 Identifier[19,19] text=""，ThrowStatement[13,19]；本仓逐字段一致。
function f(){ throw\n}
function f(){ throw\n }
function f(){ throw // c\n}

// ── ③ return 受限产生式：表达式缺省/换行，注释尾巴不进 ReturnStatement 区间 ──
function f(){ return; // c\n}
function f(){ return // c\nx; }
function f(){ return // c\n}
function f(){ return x // c\n; }
function f(){ return x // c\n}
function f(){ return x\n}
function f(){ return x\n; }

// ── ④ type 尾部行注释：行注释既不进 End，也不把下一行续进类型（type-tail-linecomment 一族） ──
type T = A; // c
// `type T = A // c\n[];`：TypeAliasDeclaration.End 停在 `A`，`[];` 收成独立 ExpressionStatement（TS 同形）
type T = A // c\n[];
type T = A // c\n[]
type T = A // c
type T = A // c\nconst y = 1;
type T = A // c\n[0];
// 对照：类型确实没写完时，换行不结束类型——`| B` 续进联合；注释只进 Pos 不进 End
type T = A // c\n| B;
type T = A | B // c\n;
type T = A /* c */\n[];
type T = A//c\n[];
type T = [string//c\n, number];
type T = () => string//c\n;
interface I { m(): void //c\n}
class C { a: string//c\n; b: number }

// ── ⑤ 声明/语句的 End 与下一行语句边界：尾随注释不进区间，零宽 OmittedExpression 落点固定 ──
const x = 1 // c
const x = 1 // c\nconst y = 2;
interface I {} // c
interface I {} // c\nconst y = 1;
class C {} // c
enum E { A } // c
namespace N {} // c
function f() {} // c
this; // c
this // c\n;
var a = [,];
var a = [1,,2];

// ── 仍缺口（本仓与 TS 不一致，不写成活跃行；以下均 TS parseDiagnostics = 0，属 TS 恢复形/End 取错） ──
// - `throw\n;`：TS 造 ThrowStatement[0,7] + 零宽 Identifier[5,5]（`;` 当终止符吞掉，diag=0）；
//   本仓抛 CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）。
//   变体 `throw /* c */\n;` 与 `throw // c\n;` 同一根因（下标 5）。
//   口径注意：只有同一行写法 `throw;` 才让 TS 报 TS1109 Expression expected（尺子不测），
//   而 `function f(){ throw\n}` 这类块体形本仓已与 TS 完全一致（见 ② 组）。
// - `function f(){ return\n; }`：TS 把换行后的 `;` 当 ReturnStatement 终止符，ReturnStatement[13,22]；
//   本仓 ReturnStatement[13,20] + 多出一个 EmptyStatement[20,22]（结构 +1、位置差 1 条）。
