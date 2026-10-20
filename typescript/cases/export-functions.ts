// 导出函数声明：`export function [*] name(…) {…}`（带体）与 `export declare function …;`（签名）。
// 关键机制：带体函数的候选只在函数体那个**已闭合**的 `{ }` 括号单元上 Done，
// BuildByIndex 一次把整条声明建好，函数体里的语句不会被根级表达式候选/ASI 边界抢走。
// 一行一个用例；行内的 \n 由 ast-json.mjs 还原成可读换行。

// ── base：带体导出函数 ──
export function f() {}
export function f(a) {}
export function f(a: A): B { return a; }
export function f(a: A, b: B): C { return a; }
export function f(): number { return 1; }

// ── generator ──
export function* g() {}
export function* g(a: A) { return a; }

// ── 签名（declare）──
export declare function g(): void;
// 未收（原因）：带参数/返回类型的 declare 签名（`export declare function g(a: A): B;`）目前只剩
// ExportKeyword/DeclareKeyword/名字/返回类型 四个 child，参数表还没建；属 function-declaration 家族的
// 无体签名路径，本块只收无参签名（任务要求的那条），不静默改。
// `// ` export declare function g(a: A): B;

// ── trivia 叠加：关键字之间 / 名字与参数之间 / 参数与函数体之间 ──
export  function f() {}
export /* c */ function f() {}
export function /* c */ f() {}
export function f /* c */ () {}
export function f() /* c */ {}
export function f()\n{}
export function\nf() {}

// ── ASI 边界：换行后是 export function ──
a\nexport function f() {}
a\nexport function f() {}\nb;
a /* c */\nexport function f() {}
a\n// c\nexport function f() {}

// ── 重复形：多条导出函数连排 ──
export function f() {}\nexport function g() {}
a\nexport function f() {}\nexport function g() {}

// ── 回归：普通函数声明与导出变量/类 ──
function h() {}
export const x = 1;
export class C {}
export default function d() {}
