// §6「缺少 possible」：整类形态一开始根本没有候选，补候选后 compute/build/close 才能进入。
// 覆盖组：D 泛型箭头 / `async<T>`、G10 装饰器声明、G11 `using` 声明、G6 类型侧候选、C4 shebang trivia。
// 来源：tests/cases/token/** 对应缺口（原 token-repros 已并入本目录）；一行一个用例，
// 行内 `\n` 由 ast-json.mjs 还原成真实换行。§5 口径：base 在前，干扰信息（trivia / 重复形）在后。
// 每条都在 TS 侧 parseDiagnostics=0 且与本仓 AST 完全一致（ast-json-diff 校验）。

// ── base：D 泛型箭头（含返回类型 / 尾逗号 / async 泛型） ──
// 历史：statements/expr-async-generic-arrow.ts（箭头函数的参数只支持标识符）、
// statements/gap-d-generics-tuple-mapped-02.ts（变量声明缺少标识符）、
// statements/stmt-adversarial-shapes.ts 第 9/10 行（尖括号断言/泛型箭头缺少配对的 >）。
const f1 = <T>(x: T): T => x;
const f2 = <T,>(x: T) => x;
const f3 = async<T>(x: T) => x;
const f4 = async <T>(x: T) => x;
// 变体：`async<T>` 的参数**不带类型标注**（原先「箭头函数的参数只支持标识符」，D 组第 1 条）
const ha = async<T>(x) => x;
// 变体：`async` + 尾逗号类型参数 + 显式返回类型（原先「变量声明缺少标识符」，D 组第 3 条）
const hb = async <T,>(x: T): Promise<T> => x;
// 变体：`async` 与 `<` 之间留空格且由 const 起头（原先「不支持的表达式起点」，D 组第 2 条）
const hc = async <T>(x: T) => x;
// 变体：泛型函数类型标注 + 箭头初始化（stmt-adversarial-shapes.ts 同文件第 10 行）
const g2: <T>(x: T) => T = (x) => x;

// ── 装饰器声明（G10）：类声明与类成员的 base 形 ──
@dec class D {}
class E { @dec m() {} }
// 变体：装饰器 + `export abstract class`（G10 的修饰词序列）
@dec export abstract class A1 {}
// 变体：方法参数位装饰器（decl-class-decorator-parameter.ts 同族）
class F1 { m(@dec p: any) {} }
// ── 装饰参数：缺类型标注 / 默认值（G10 家族，ClassDeclarationShape.BuildParameters） ──
// 变体：装饰参数**不带类型标注**——原先装饰参数分支强制要求 `:`，抛
// 「装饰过的类成员参数缺少类型标注」；TS parseDiagnostics=0，Parameter children = Decorator + Identifier。
class F2 { m(@dec p) {} }
// 变体：装饰参数 + 默认值——同一分支完全不吃 `= 1`（`=` 不进 Parameter children）。
class F3 { m(@dec p = 1) {} }
// 变体：构造函数里的装饰参数——同一条 BuildParameters 分支。
class F4 { constructor(@dec p) {} }
// 核心缺口：装饰器 + type alias / interface / namespace 原先没有「从 `@` 起」的候选，
// `@` 落到表达式语句后报「不支持的表达式起点」；现在声明从 `@` 起、装饰器进 modifiers。
// 历史：declarations/decl-type-alias-decorator.ts、decl-interface-decorator-modifiers.ts、
// decl-namespace-decorator-modifiers.ts。
@dec export type TT = number;
@dec export declare interface II {}
@dec export declare namespace NN {}

// ── using 声明（G11）：原先只有表达式语句候选接住它，EOF 处终结候选与它同时成立 ──
using x1 = a;
// base 形：无分号 + EOF（declarations/decl-using-basic.ts）
using u1 = open()
// 变体：`using` 之后紧跟下一条语句（原先「表达式没有读完」/「终结候选与其它候选同时成立」）
using u2 = open()\nlet b1 = 1
// 变体：`using` 之后紧跟带调用的语句（同一缺口的下一条语句形态）
using u4 = open()\nconsole.log(u4)
// 变体：`await using`
await using u3 = open();

// ── 类型侧候选（G6）：类宿主的索引签名（原先 `[k: T]` 被当 computed 成员名） ──
// 接口宿主是 base 对照：同一形状在接口上一直是好的（de-ClassDeclarationShape.BuildMembers）。
interface I1 { [k: string]: number }
// 核心缺口：class 宿主 `[k: T]`，原先「computed 成员名没有读完」，装饰器式报「类成员之间缺少分隔符」。
// 历史：types/type-index-signature.ts、types/type-member-index-signature.ts。
class C1 { [k: string]: number }
class C2 { readonly [k: symbol]: string }
// 映射类型 `as` 重映射（键名重映射 + 模板字面量类型键）
type M1 = { [K in keyof T as `k${K}`]: T[K] };

// ── 其它类型侧候选：`typeof import`、条件类型 infer 约束、`satisfies`、模板字面量类型 ──
type TI = typeof import("./m1");
// ── import 类型：无限定名（TypeBuilder.ParseImportType，Qualifier 在 TS 侧可选） ──
// import 类型**不带限定名**：`import("m")` 本身合法（TS ImportType children 只有 LiteralType）；
// 原先强制要求 `.`，抛「import 类型缺少限定名」。
type IT1 = import("./m1");
// 变体：import 类型 + attributes 且无限定名（TS children = LiteralType + ImportAttributes）。
type IT2 = import("./m1", { with: { type: "json" } });
type CT = T extends Array<infer U extends string> ? U : never;
const s1 = {} satisfies Record<string, number>;
type TL = `a${string}b`;

// ── C4 shebang：`#!` 作首行 trivia 的候选存在性 ──
// 原先 `#` 被当 PrivateIdentifier 前缀、`!` 另起单元 →「私有标识符缺少名字」；
// 字符归类一侧的对照在 basic-token.ts，这里钉住「候选存在」这条（§3.1 把 C4 计入本类）。
// 历史：lexical/lex-shebang.ts、lexical/lx-shebang.ts。
#!/usr/bin/env node\nconst sb1 = 1;
#!/usr/bin/env node\nlet sb2 = 1;

// ══ cover5 round5（missing possible）：块 / 体 / 被标体里的「声明头」分派 ══
// 缺口：`StatementBuilder.BuildStatement` 只认 function / class / interface / enum / type / 变量
// 这几种声明头，`namespace` / `abstract class` / `const enum` / `declare <声明>` / 装饰器声明 /
// `export <声明>` 在块体里没有分派入口 → 落 ExpressionStatement 兜底（「表达式没有读完」/
// 「不支持的表达式起点」）。根级另有两条零候选：`yield 1;`（表达式候选的 CanStart 不认 yield）
// 与 `l: const enum E { A }`（StatementScanner.ScanBody 对 const enum 直接 Mismatch）。
// 修复：BuildStatement 增加声明头分派（BuildModuleDeclaration / BuildDecoratedStatement /
// BuildExportedStatement / BuildDefaultModifierStatement）并把 class / interface / enum / function
// 四个 builder 的起始格泛化（起始格可以是修饰词 / 装饰器前缀）；ScanBody 的 const enum 走声明体。
// TS 侧全部 parseDiagnostics=0，且与本仓 AST 完全一致（ast-json-diff 校验）。

// ── base：块内 namespace（标识符名）/ 变体：module + 字符串名 / 限定名 / 嵌套 / 成员族 ──
{ namespace N { let a = 1; } }
{ module 'm' { export let a = 1; } }
{ namespace A.B.C {} }
{ namespace A { namespace B {} } }
{ namespace N { class C {} interface I {} enum E { A } function f() {} type T = 1; } }
// trivia 变体：namespace 前的前导注释
{ /* c */ namespace N {} }
// 重复形：同一块里多条模块声明 + 枚举声明
{ namespace A {} namespace B {} const enum E { A } }

// ── 块内 abstract class / const enum ──
{ abstract class A {} }
function f() { abstract class A {} }
{ const enum E { A } }
// 重复形：块里 abstract class 后接 const enum
{ abstract class A {} const enum E { A } }
// static block 体同样走语句派发
class C { static { const enum E { A } } }

// ── 块内 `declare <声明>` 族（原先只有 declare + 变量有入口） ──
{ declare class C {} }
{ declare interface I {} }
{ declare enum E { A } }
{ declare const enum E { A } }
{ declare namespace N {} }
{ declare module 'm' {} }
{ declare type T = number; }
{ declare function f(): void; }
{ declare abstract class C {} }
// trivia 变体：declare 与声明词之间多空格
{ declare   class   C   {} }

// ── 块内装饰器声明（@ 开头的声明头原先零候选） ──
{ @dec class C {} }
{ @dec('x') class C {} }
{ @a @b.c class C {} }
{ @dec abstract class A {} }
{ @dec export class C {} }
{ @dec interface I {} }
{ @dec type T = number; }
{ @dec enum E { A } }
{ @dec namespace N {} }
function f() { @dec class C {} }

// ── 块内 export 声明（export 修饰词摘掉再插回 Data 最前） ──
{ export class C {} }
{ export const x = 1; }
{ export enum E { A } }
{ export interface I {} }
{ export type T = 1; }
{ export namespace N {} }
{ export function f() {} }
{ export abstract class C {} }
{ export declare class C {} }
{ export default class C {} }
{ export default class {} }
{ export default interface I {} }
{ export default abstract class C {} }
{ export default function f() {} }
// 重复形：同块里 export 声明连排
{ export class A {} export const b = 1; }

// ── namespace / module 体里的同类变体 ──
declare module 'm' { export default abstract class C {} }
namespace N { @dec class C {} }
namespace N { export @dec class C {} }
namespace N { const enum E { A } }
namespace N { declare class C {} }

// ── 被标体里的声明（ScanBody 的 const enum / 声明体） ──
l: const enum E { A }
l: abstract class A {}
l: @dec class C {}

// ── 根级表达式起点：`yield 1;` 原先被 IsStatementWord 挡掉 → 零候选 ──
yield 1;

// ══ cover8（块内 import/export 与装饰器声明头）════
// 缺口：块 / 体 / 被标体（以及模块体）里 `import x from "m"` / `export { a }` / `export * from "m"` /
// `export = <expr>` / `export default <expr>` / 匿名 `export default function () {}` 没有分派，
// 全部落 ExpressionStatement 兜底（「表达式没有读完」/「函数声明的名字不是标识符」）；
// 模板块的 `export { a }` 无分号成员漏收；`@dec` 在根级只认 class/interface/type/namespace，
// function / enum 的装饰器候选缺失（块内 function 也缺）。
// 修复：BuildStatement 增加 import / export 语句分派（BuildImportStatement / BuildExportStatement +
// 四个子分派，复用 Import/Export/ImportEquals/NamespaceExport/ExportAssignment 的 FromUnits）；
// FunctionDeclarationShape.FromUnits 支持装饰器前缀与匿名（allowAnonymous）；
// Function/Enum 的根级 PossibleShape 增加 `@` 装饰器 Stage；ModuleBlockShape 的无分号 export 子句。
// TS 侧全部 parseDiagnostics=0，且与本仓 AST 完全一致（ast-json-diff 校验）。

// ── base：块内 import 声明（side-effect / 默认 / 具名 / namespace / type-only） ──
{ import 'm'; }
{ import x from 'm'; }
{ import { a } from 'm'; }
{ import * as ns from 'm'; }
{ import type { A } from 'm'; }
{ import x from 'm' with { type: 'json' }; }
// 变体：无分号 + 块内下一条语句（块级 ASI 收口，补零宽合成 `;` 交给 FromUnits）
{ import x from 'm'\n  let b = 1; }
// 重复形：同一块里两条 import
{ import x from 'a'; import y from 'b'; }
// trivia 变体：import 前的前导注释
{ /* c */ import x from 'm'; }
// import-equals（含 type-only）
{ import x = require('m'); }
{ import type x = require('m'); }

// ── 块内 export 声明（具名 / star / star-as / from / type-only） ──
{ export { a }; }
{ export * from 'm'; }
{ export * as ns from 'm'; }
{ export { a } from 'm'; }
{ export type { A }; }
{ export type * from 'm'; }
// 变体：无分号 + 块内下一条语句
{ export { a }\n  let b = 1; }
// 重复形：同一块里两条 export 子句
{ export { a }; export { b }; }
// export as namespace / export import =
{ export as namespace X; }
{ export import x = require('m'); }

// ── 块内 ExportAssignment（children 只有表达式） ──
{ export = foo; }
{ export = class {}; }
{ export default 1; }
{ export default foo(); }
// 变体：无分号收口（requireSemicolon=false）
{ export = foo }
{ export default foo }

// ── 匿名 export default function / class（export / default 修饰词 + 匿名声明） ──
{ export default function () {} }
{ export default function* () {} }
{ export default async function () {} }
{ export default class {} }

// ── 模板块成员：无分号 export 子句（下一个成员首词 / 体末收口） ──
declare module 'm' {\n  export { a }\n}
declare module 'm' {\n  export * from 'n'\n}
declare module 'm' {\n  export { a }\n  let b = 1;\n}
namespace N {\n  export { a }\n}

// ── 装饰器接 function / enum（块内 + 根级；换行 / 同行两种排布） ──
{ @dec function f() {} }
{ @dec\n  function f() {}\n}
{ @dec('x')\n  function f() {}\n}
{ @dec enum E { A } }
{ @dec\n  enum E { A }\n}
declare module 'm' {\n  @dec\n  function f(): void;\n}
@dec\nfunction f() {}
@dec enum E { A }
@dec\nenum E { A }

// ══ cover9（装饰器贴变量声明 + 尾随 `global {}` 模块头）════
// 缺口（§6「缺少 possible」）：① 装饰器前缀 + 变量声明 `@dec const x = 1;`——块 / 体里
// `BuildStatement` 的 `@` 分派只认 class / interface / enum / type / function / namespace，
// 变量族没有入口，退表达式语句报「不支持的表达式起点」；根级同一形态落到 EOF 兜底
// （`SourceFileEndPossibleShape.BuildTrailingDeclaration`）也没有「装饰器 + 变量」通道。
// ② `declare function gf(): void` ⏎ `global {}`——`global {}` 是 ModuleDeclaration 的 global
// 关键字形；函数候选在返回类型后的 ASI 截断点把尾巴硬当 ExpressionStatement 建，报「表达式语句缺少分号」。
// 修复：StatementBuilder 增加 BuildDecoratedVariableStatement（TypeBuilder.ParseDecorators 建装饰器，
// BuildVariableStatement(decoratedFirst) 把区间 / Pos 锚到第一个 `@`）并接进 BuildDecoratedStatement；
// BuildTrailingDeclaration 增加「装饰器 + 变量关键字」通道（ScanDecoratedHead 判词，只接 const/let/var）；
// FunctionDeclarationPossibleShape.BuildByIndex 的截断尾巴在 `global` 开头时交给 StatementBuilder 的语句分派。
// 候选：A17–A21 / C07–C08（tests/cover9/candidates.json）；TS 侧 parseDiagnostics=0，AST 三栏全一致。

// ── base：块内装饰器变量声明（const，装饰器与关键字分行） ──
{ @dec\n  const x = 1;\n}
// 变体：let / var / 多声明（同一形态换关键字 / 声明列表可重复）
{ @dec\n  let x = 1;\n}
{ @dec\n  var x = 1;\n}
{ @dec\n  const x = 1, y = 2;\n}
// trivia 变体：装饰器与关键字同行 / 装饰器前的前导注释 / 装饰器后的词间注释
{ @dec const x = 1; }
{ /* c */ @dec\n  const x = 1;\n}
{ @dec /*c*/\n  const x = 1;\n}
// 重复形：两个装饰器 / 块内后续语句（同一块多条语句）
{ @a @b\n  const x = 1;\n}
{ @dec\n  const a = 1;\n  const b = 2;\n}
{ @dec\n  const x = 1;\n  let y = 2;\n}

// ── base：根级装饰器变量声明 ──
@dec\nconst x = 1;
// trivia 变体：装饰器与关键字同行 / 带参装饰器
@dec const x = 1;
@dec('x')\nconst x = 1;
// 重复形：多个装饰器（含成员访问）/ 根级后续语句
@a @b.c\nconst x = 1;
@dec\nconst x = 1;\nconst y = 2;

// ── base：`declare function` 之后尾随 `global {}`（ModuleDeclaration 的 global 关键字形） ──
declare function gf(): void\nglobal {}
// 变体：global 体里有成员 / 体内换行
declare function gf(): void\nglobal { const x = 1 }
declare function gf(): void\nglobal {\n  const x = 1;\n}
// trivia 变体：空行 / 块注释
declare function gf(): void\n\nglobal {}
declare function gf(): void\n/* c */ global {}
// 重复形：体内多声明 / 尾随两个 global 模块
declare function gf(): void\nglobal { const x = 1, y = 2 }
declare function gf(): void\nglobal {}\nglobal {}
