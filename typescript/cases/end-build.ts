// §6「end build 不对」：close 时取 End 的单元取错（零宽节点落点 / 尾随注释尾巴）。
// 覆盖组：D9 —— `throw` 无参数恢复出的零宽 Identifier 落点、type-tail 行注释之后不得把下一行续进类型。
// 来源：token-repros 与 statements/stmt-throw-no-argument-then-statement、types/type-tail-linecomment 的修复。
//
// 状态（Wave-2 修复后）：
//   · `type T = A // c\n[];`：TS parseDiagnostics=0，本仓 AST 与 TS 完全一致——TypeAliasDeclaration.End
//     停在 `A`（[0,10)），`[]` 是独立的 ExpressionStatement；**活跃行**（见 ④ 组第二条）；
//   · `throw\n;`（及带注释的两种变体）：本轮已修好，**活跃行**（见 ①② 组之间那组）——
//     根因是换行后的 `;` 没了结 throw（根层 statement 候选拖到 EOF，与根终结候选同时 Accept），
//     修在 `statement-scanner.ScanReturnOrThrow`（换行后紧跟的 `;` 收在 `;` 上）；
//   · `function f(){ return\n; }`：本轮已修好，**活跃行**（见 ③ 组第二条）——
//     修在 `statement-builder.BuildReturnOrThrow`（换行后紧跟的 `;` 计入 End，不新起 EmptyStatement）。
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

// ── ①' 换行后的 `;` 归上一条 throw（TS 把它当终止符吞进 End，零宽 Identifier 落在关键字之后） ──
// 修复前：根层 CRASH（CatalogGuide: 终结候选与其它候选同时成立，下标 3/5）。
// 修复后：`throw\n;` = ThrowStatement[0,7] + Identifier[5,5] text=""，逐字段一致。
throw\n;
throw /* c */\n;
throw // c\n;

// ── ② throw 无参数：零宽恢复 Identifier 的落点（pos=end，落在下一格而不撑大语句 End） ──
// `function f(){ throw\n}` —— TS 造 Identifier[19,19] text=""，ThrowStatement[13,19]；本仓逐字段一致。
function f(){ throw\n}
function f(){ throw\n }
function f(){ throw // c\n}

// ── ③ return 受限产生式：表达式缺省/换行，注释尾巴不进 ReturnStatement 区间 ──
function f(){ return; // c\n}
// 换行后的 `;` 归 return：TS ReturnStatement[13,22]；修复前本仓 End 停在 [13,20] 并多一个 EmptyStatement[20,22]。
function f(){ return\n; }
function f(){ return // c\n; }
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

// ── 修复记录（Wave-2，原先这两条是 deferred 注释；现已全部转为活跃行） ──
// - `throw\n;`：修复前 TS=ThrowStatement[0,7]+Identifier[5,5]（diag=0），本仓抛
//   CatalogGuide: 终结候选与其它候选同时成立（宿主 SourceFileShape，下标 3）；变体下标 5。
//   根因：ScanReturnOrThrow 在「throw 后换行」时 Complete 在关键字上，换行后的 `;` 成了另一条
//   空语句的新起点，根层 statement 候选一直活到 EOF 哨兵，与根终结候选同时 Accept。
//   修法：换行后紧跟的 `;` 收在 `;` 那一格（`statement-scanner.xl.md`）；Builder 侧把 `;` 计入 End。
//   口径注意：只有同一行写法 `throw;` 才让 TS 报 TS1109 Expression expected（尺子不测）。
// - `function f(){ return\n; }`：修复前 TS ReturnStatement[13,22]，本仓 ReturnStatement[13,20] +
//   EmptyStatement[20,22]（结构 +1、位置差 1）。根因：BuildReturnOrThrow 的换行分支放弃 `;`。
//   修法：换行后紧跟的 `;` 计入 End，不新起 EmptyStatement（`statement-builder.xl.md`）。

// ── ⑥ TS WhiteSpace 覆盖 `\v` / `\f`：这两个字符是 trivia，不是标识符 / 数字的一部分 ──
// 缺口（end build：trivia 被吞 → Pos/End 偏移）。core 的 `SymbolTemplate.IsWhiteSpace` 只认空格 / `\t` / `\r` / `\n`，
// `\f`(U+000C) / `\v`(U+000B) 于是被 `Common`、数字模板与语句扫描的字符白名单漏掉：
//   · `throw e\f`：TS `ThrowStatement[0,7]` + `Identifier[5,7]`；修前本仓 End 被撑到 8
//     （`core/syntax/templates/symbol-template.xl.md:222 IsWhiteSpace`）；
//   · `class C {}\f`：TS 只有一条 `ClassDeclaration[0,10]`；修前 `\f` 被 `Common` 当成标识符，
//     多出一条 `ExpressionStatement`（`typescript/tokens/files/source-file-end-possible-shape.xl.md:54 ComputeByIndex`
//     的 EOF 兜底拿到的最后代码单元不对）；
//   · `let x = 1\f`：修前抛「表达式语句没有读完」；`return\f`：`\f` 已进 `WrapSymbol` 后语句候选与根终结候选
//     仍同时 `Accept`——`typescript/tokens/statements/statement-scanner.xl.md:665 NextChar` 的 4 字符白名单
//     没跳过 `\f`，AtEOF 判不出来。
// 修法（只改 typescript/，core 不动）：
//   · 新增 `typescript/run/typescript-symbol-template.xl.md`：`TypeScriptSymbolTemplate.IsWhiteSpace` 在 core 四种外
//     补 U+000B/U+000C，`TypescriptTemplate.Create` 换用它；空白块认领后判形状一律跳过、`Close` 丢弃；
//   · `statement-scanner.NextChar/NextWord`、`expression-builder`、`statement-builder` 与
//     import / export / import-equals 的字符白名单同步补 `\v` / `\f`（它们按文档字符扫，不走 token 的 `IsWhiteSpace`）；
//   · `ast-json.mjs` 的 `decodeCaseText` 支持 `\v` / `\f` 转义（与 `\n` 同口径：字符串 / 模板 / 正则里不解码）。
// 什么时候 build / close：与普通空白完全一样——这两个字符由 `WrapSymbol` 收成 trivia，不参与任何形状判定；
// build 时 `Data` 里仍留着它，但 `Close` 取 End 一律落到最后一个非 trivia 代码单元，字段与 End 都不含它。
throw e
throw e\f
throw e\v
throw e\f;
throw e\v;
throw e /* c */\f
throw e /* c */\v
return
return;
return\f
return\v
break
break\f
break\v
continue
continue\f
continue\v
debugger
debugger\f
debugger\v
if (a) b
if (a) b\f
if (a) b\v
class C {}
class C {}\f
class C {}\v
interface I {}
interface I {}\f
enum E { A }
enum E { A }\f
namespace N {}
namespace N {}\f
function f() {}
function f() {}\f
switch (a) { case 1: b }
switch (a) { case 1: b }\f
let x = 1
let x = 1\f
let x = 1\v
const x = 1\f
var y
var y\f
type T = A
type T = A\f
type T = A\v
import x from "m"
import x from "m"\f
import x from "m"\v
import x = require("m")
import x = require("m")\f
export {}
export {}\f
export * from "m"
export * from "m"\f
export = 1
export = 1\f
export default 1
export default 1\f
declare function f(): void
declare function f(): void\f
x
x\f
x\v
throw e\f\n;
let\f x = 1;
function\f f() {}
a\f+\fb
\f
\v
