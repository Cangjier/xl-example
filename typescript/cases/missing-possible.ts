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
type CT = T extends Array<infer U extends string> ? U : never;
const s1 = {} satisfies Record<string, number>;
type TL = `a${string}b`;

// ── C4 shebang：`#!` 作首行 trivia 的候选存在性 ──
// 原先 `#` 被当 PrivateIdentifier 前缀、`!` 另起单元 →「私有标识符缺少名字」；
// 字符归类一侧的对照在 basic-token.ts，这里钉住「候选存在」这条（§3.1 把 C4 计入本类）。
// 历史：lexical/lex-shebang.ts、lexical/lx-shebang.ts。
#!/usr/bin/env node\nconst sb1 = 1;
#!/usr/bin/env node\nlet sb2 = 1;
