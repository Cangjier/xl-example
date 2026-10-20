// using 声明（TS 5.2+）：每个语句一条；base 先给，再叠 trivia / 重复形。

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
// ===== await using（async 函数体内） =====
async function f() { await using x = a; }
async function f() { await using x = a; await g(); }
async function f() { await using x: A = a; }
async function f() { await using a = x, b = y; }
async function f() { { await using y = b; } }
async function f() { /* c */ await using x = a; }
async function f() { await /* c */ using x = a; }
async function f() { await  using  x  =  a ; }
// ===== await using（顶层，await+using 优先规则） =====
await using x = a;
await using x: A = a;
await using x = a; // c
// ===== for-await-using =====
for (await using x of xs) {}
async function f() { for (await using x of xs) {} }
