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

// ══ cover5 round5（end build）：EOF 尾随声明的「修饰词 / 装饰器」前缀 ══
// 形态：前缀声明无分号、无体地落在 EOF 前（declare function / 函数签名 / type / export const / import =），
// 尾随一条以修饰词（abstract / async / export）或装饰器（@dec）开头的声明。TS 的 AST 里它们是两条独立声明，
// 修饰词属于后一条声明的 children；修复前本仓把后一条整体漏掉（crash「表达式语句没有读完」）或建错
//（export default class / function 被当成 ExportAssignment + ClassExpression / FunctionExpression）。
// 根因（end build）：SourceFileEndPossibleShape 的 EOF 兜底 BuildTrailingDeclaration 只认「段首字面就是
// 声明词」，且 export default 一律走表达式路；修复＝按「修饰词 + 声明词」识别后交给对应 FromUnits、
// 识别装饰器开头的 class、export default 后是 class/function/interface 声明形时建声明（修饰词按 TS 顺序插入）。
// 一行一个用例，行内 `\n` 由 ast-json.mjs 还原。

// ── ① abstract class / declare abstract class 作为 EOF 尾随声明（修复前 crash：表达式语句没有读完） ──
declare function f(): void\nabstract class C {}
declare function f(): void\nabstract class C { m() {} }
declare function f(): void\nabstract class C extends B {}
declare function f(): void\ndeclare abstract class C {}
declare function f(): void\ndeclare abstract class C { m(): void }
declare function f(): void\n\nabstract class C {}
declare function f(): void // c\nabstract class C {}
declare function f(): void /* c */\nabstract class C {}
declare function f(): void\nabstract class C {} // c
declare function f(): void\nabstract class C {}\n
declare function f(): void\nabstract class C {}\ninterface I {}

// ── ② async function / declare async function（修复前 crash 或结构差：FunctionDeclaration 缺失） ──
declare function f(): void\nasync function g() {}
declare function f(): void\nasync function g(a: A): B { return a; }
declare function f(): void\nasync function* g() {}
declare async function f(): void
declare async function f(): void // c
declare async function f(a: A): B
declare function f(): void\n\nasync function g() {}
declare function f(): void // c\nasync function g() {}
declare function f(): void\nasync function g() {} // c
type T = A\ndeclare async function f(): void
declare function f(): void\nasync function g() {}\ninterface I {}

// ── ③ export enum / export declare enum / export const enum（修复前 crash：表达式语句没有读完） ──
declare function f(): void\nexport enum E { A }
declare function f(): void\nexport enum E { A, B }
declare function f(): void\nexport declare enum E { A }
declare function f(): void\nexport const enum E { A }
declare function f(): void // c\nexport enum E { A }
declare function f(): void\nexport enum E { A } // c
declare function f(): void\nexport enum E { A }\ninterface I {}

// ── ④ export import = require(...) 到 EOF（修复前 crash：表达式语句没有读完） ──
export import y = require("m")
export import y = require("m") // c
export import type y = require("m")
type T = A\nexport import y = require("m")
declare function f(): void\nexport import y = require("m")
declare function f(): void\nexport import y = require("m")\ninterface I {}

// ── ⑤ export default 的声明形（TS：ExportKeyword/DefaultKeyword 是声明自身修饰词，不是 ExportAssignment） ──
declare function f(): void\nexport default class C {}
declare function f(): void\nexport default class C extends B {}
declare function f(): void\nexport default abstract class C {}
declare function f(): void\nexport default function g() {}
declare function f(): void\nexport default function* g() {}
declare function f(): void\nexport default async function g() {}
declare function f(): void\nexport default interface I {}
declare function f(): void\nexport default class C {} // c
declare function f(): void\nexport default class C {}\ninterface I {}

// ── ⑥ 装饰器开头的 class 作为 EOF 尾随声明（修复前 crash：不支持的表达式起点 / 结构差） ──
type T = A\n@dec class C {}
type T = A\n@dec class C { m() {} }
type T = A\n@a @b class C {}
type T = A\n@dec() class C {}
type T = A\n@dec export class C {}
type T = A\n@dec export default class C {}
type T = A // c\n@dec class C {}
type T = A\n\n@dec class C {}
export const ec = 1\n@dec class C {}
import x = require("m")\n@dec class C {}

// ══ cover8（装饰器尾随声明）：函数类声明前缀之后换行接「装饰器 + 声明」 ══
// 形态：无体函数声明（declare function / 重载签名 / async / generator / 泛型）在前，换行后是
// 以 `@dec` 开头的下一条声明。TS 是两条声明：函数**没有 body**、装饰器声明完整且区间正确。
// 修复前（end build）：函数候选 Stage3/4 的 ASI 边界只认 statement word（Common），`@` 是 Symbol 看不到，
// 于是把下一条声明的 `{…}` 收成函数体（diff：函数多 Block、下一条声明整条丢失）或抛「返回类型没有读完」。
// 修复：① function-declaration-possible-shape 的 Stage3/4 把「换行后的 `@`」认作边界（Reject，与
//        source-file-end-possible-shape 的 LeadingDeclarationKeyword 同口径，只认 `@` 这一种形态）；
//       ② function-declaration-shape.FromUnits 在返回类型于换行处被截断后重判 body（bodyUnit=null），
//        避免函数凭空多 Block。
// 一行一个用例，行内 `\n` 由 ast-json.mjs 还原。
declare function gf(): void\n@dec class C {}
function f(): void\n@dec class C {}
function f(a: A): B\n@dec class C {}
declare function gf<T>(): T\n@dec class C {}
declare async function ga(): void\n@dec class C {}
function* g(): void\n@dec class C {}
declare function gf(): void\n@a @b class C {}
function f(): void\n@a @b class C {}
declare function gf(): void\n@dec() class C {}
declare function gf(): void\n@dec(a) class C {}
declare function gf(): void\n@a.b class C {}
declare function gf(): void\n@dec abstract class C {}
declare function gf(): void\n@dec export class C {}
declare function gf(): void\n@dec export default class C {}
declare function gf(): void\n@dec class C { m() {} }
declare function gf(): void\n@dec class C extends B {}
declare function gf(): void\n\n@dec class C {}
declare function gf(): void // c\n@dec class C {}
declare function gf(): void /* c */\n@dec class C {}
declare function gf(): void\n/* c */\n@dec class C {}

// ══ cover9（end build）：无体声明 / import= 之后换行接「装饰器（可跨行）+ 声明」的 ASI 收口 ══
// 类别（IMPORTANCE §6）：end build 不对。
// 形态：前一条是**无体**声明（declare function 签名 / function / export function / export default function /
// import x = require("m")），换行后是**装饰器开头的下一条声明**——装饰器与声明词各占一行（`@dec` ⏎ `class`），
// 装饰器可跨行（`@a` ⏎ `@b`）、可多个（`@a @b`）、可带行尾注释；声明词覆盖 class / abstract class / export class /
// interface / enum / type / namespace / function。TS：前一条在换行处 ASI 收口（无体仍无体），装饰器是下一条
// 声明 children 的第一项，下一条声明的区间从 `@` 起。
// 修复前：SourceFileEndPossibleShape 的 EOF 尾随分界把 `@dec` 与声明词切成两段（crash「不支持的表达式起点」）；
// export function / export default function 候选还会把下一条声明的 `{…}` 当函数体（crash「函数声明的返回类型
// 没有读完」）；装饰器尾随段的分派面只接 class（interface / enum / type / namespace / function 全漏）。
// 修复：①「@（可跨行、可多个）+ 修饰词 + 声明词」做成一份共用判据（StatementScanner.DecoratedHeadKeyword /
//        IsDecoratedDeclarationStart；source-file-end 的 EOF 分界、export 候选的 ASI、function 候选的 Stage3/4
//        同口径）；② 尾随段按声明词分派到 class / interface / enum / type / namespace / function 的 FromUnits；
//        ③ `let` ⏎ `let` 的前缀收不住语句，不作为多语句分界（TS 读成一条 VariableStatement）。
// 候选 id：A01–A16 共用前四组；C01 是最后的 let 组。一行一个用例，行内 `\n` 由 ast-json.mjs 还原。

// ── ① base：declare function 无体签名之后接 `@dec` ⏎ `class`（A01），再叠加 trivia 与重复形 ──
declare function gf(): void\n@dec\nclass C {}
declare function gf(): void // c\n@dec\nclass C {}
declare function gf(): void /* c */\n@dec\nclass C {}
declare function gf(): void\n// c\n@dec\nclass C {}
declare function gf(): void\n\n@dec\nclass C {}
declare function gf(): void\n@dec\nclass C {} // c
declare function gf(): void\n@dec\nclass C { m() {} }

// ── ② 前一条的修饰 / 形态：裸 function / export function / export default function / import =（A02–A05） ──
function f(): void\n@dec\nclass C {}
export function f(): void\n@dec\nclass C {}
export default function f(): void\n@dec\nclass C {}
import x = require("m")\n@dec\nclass C {}

// ── ③ 装饰器前缀的形态：多装饰器同行 / 逐行 / 装饰器后 trivia（A06–A08）与重复形 ──
declare function f(): void\n@a @b\nclass C {}
declare function f(): void\n@a\n@b\nclass C {}
declare function f(): void\n@dec /*c*/\nclass C {}
declare function f(): void\n@a\n@b\n@c\nclass C {}
declare function f(): void\n@a /* c */\n@b\nclass C {}

// ── ④ 声明词分派：class 修饰词（abstract / export）与 interface / enum / type / namespace / function（A09–A15） ──
declare function gf(): void\n@dec\nabstract class C {}
declare function gf(): void\n@dec\nexport class C {}
declare function f(): void\n@dec\nexport class C {}
declare function f(): void\n@dec\ninterface I {}
declare function f(): void\n@dec\ninterface I { m(): void }
declare function f(): void\n@dec\nenum E { A }
declare function f(): void\n@dec\nenum E { A, B }
declare function f(): void\n@dec\ntype T = number;
declare function f(): void\n@dec\ntype T = A | B;
declare function f(): void\n@dec\nnamespace N {}
declare function f(): void\n@dec\nnamespace N { export const x = 1; }
declare function f(): void\n@dec\nabstract class C { m(): void }
declare function f(): void\n@dec\nfunction g() {}
declare function f(): void\n@dec\nfunction g(a: A): B { return a; }

// ── ⑤ 装饰器声明之后还有第三条语句（A16）与换一种声明词（重复形） ──
declare function f(): void\n@dec\nclass C {}\nlet z = 1
declare function f(): void\n@dec\nclass C {}\ninterface I {}
declare function f(): void\n@dec\ninterface I {}\nlet z = 1

// ── ⑥ C01：`let` ⏎ `let = 1` 是**一条** VariableStatement（前缀收不住语句，不切分） ──
let\nlet = 1
let // c\nlet = 1
let\n/* c */\nlet = 1
let\n\nlet = 1
let\nlet = 1, x = 2
let\nlet = 1\n

// ══ cover9（end build）：EOF 多语句分界把 export 声明头从中间切开（O01–O07） ══
// 类别（IMPORTANCE §6）：end build 不对。
// 形态：`export default` ⏎ 声明词 / `export as` ⏎ `namespace` —— 修饰词链内部有换行；
// TS 的 parseModifiers 对 export / default / as / import 不看换行，整段仍是**同一条**声明的声明头。
// 修前：SourceFileEndPossibleShape 的 EOF 多语句分界（source-file-end-possible-shape.xl.md:515-607）
//       只放行「前一个代码单元是 export」，链内部的 default / as 不放行 → 前缀只剩 `export default` /
//       `export as`，走表达式路径 crash「表达式语句没有读完」/「类型意外结束」。
// 修复：分界前用 IsInsideExportModifierChain 回溯 export / default / as / import 修饰词链，链内部不设边界；
//       declare / abstract / async 与下一格之间换行在 TS 侧是另一条语句，不吞。
// 同族附加（非候选）：`export function f(): void` ⏎ `interface/class` 是本仓 export 候选把下一条声明的
//       `{…}` 当函数体（Stage 16/23 判据 IsNewDeclarationAfterLineBreak，与 Y13 同一修）。
// 候选 id：O01–O07；一行一个用例，行内 `\n` 由 ast-json.mjs 还原，CR / LS / PS 用行内字面字符。

// ── ① `export default` ⏎ 函数声明头（O01）：生成器 / async / 行注释 / 含换行块注释 / 双换行 / 后接语句 ──
export default\nfunction f(): void
export default\nfunction* g(): void
export default\nasync function f(): void
export default // c\nfunction f(): void
export default /* \n */ function f(): void
export\ndefault\nfunction f(): void
export default\nfunction f(): void\nconst x = 1

// ── ② `export as` ⏎ `namespace`（O02–O06）：base / 多空格 / 双换行 / 含换行块注释 / CR / LS / PS ──
export as\nnamespace A
export  as\nnamespace A
export\nas\nnamespace A
export as /* \n */ namespace A
export asnamespace A
export as namespace A
export as namespace A

// ── ③ 后接 `export =`（O07）──
export as\nnamespace A\nexport = A
export\nas\nnamespace A\nexport = A

// ── ④ 同族附加：`export function f(): void` ⏎ 下一条声明（候选曾把下一条声明的 `{…}` 当函数体）──
export function f(): void\ninterface I {}
export function f(): void\nclass C {}
