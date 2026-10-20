// using 声明（TS 5.2+）：每个语句一条；base 先给，再叠 trivia / 重复形。
// await using 只在 async 函数体内测量（顶层 await using 会与表达式语句候选抢同一格，暂缓）。

// ===== base =====
using x = a;
using x: A = a;
using x = f();
{ using x = a; }
using a = x, b = y;
using x = a, y = b;
using { a } = x;
for (using x of xs) {}
switch (a) { case 1: using x = b; }
// ===== trivia =====
using /* c */ x = a;
using x /* c */ = a;
using x = /* c */ a;
/* c */ using x = a;
using x = a; // c
using x = a; using y = b;
type T = number;
// ===== await using（async 函数体内） =====
// 暂缓：async function f() { await using x = a; }
// 暂缓：async function g() { { await using y = b; } }
// 暂缓：async function h() { await using x: A = a; }
