// generator-functions 用例集：function* 生成器声明 + 体内 yield / yield*。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// 快照：node typescript/cases/ast-json.mjs generator-functions && node typescript/cases/ast-json-diff.mjs generator-functions
//
// 口径（TS 实测）：
//   FunctionDeclaration children = [DeclareKeyword?] [AsteriskToken?] Identifier、Parameter 们、[返回类型]、Block；
//   YieldExpression children = [AsteriskToken?] [operand?]（`yield` 关键字本身不是节点；`yield;` 没有 children）。

// ===== 1. generator 函数声明 =====
function* f() {}
function* f() { }
function* f(a) { return a; }
function* f(): void {}
function* f(a: A): B { return a; }
// + trivia：function 与 * 之间、* 与名字之间、前导注释
function /* c */ * /* d */ f() {}
function\n* f() {}
function *f() {}
function* /* c */ f() {}
/* c */ function* f() {}

// ===== 2. 体内 yield / yield* =====
function* g() { yield; }
function* g() { yield 1; }
function* g() { yield a + b; }
function* g() { const x = yield 1; }
function* g() { x = yield; }
function* g() { x = yield 1; }
function* g() { yield* h(); }
function* g() { yield* h(1, 2); }
function* g() { yield (1); }
// + trivia：yield / 操作数 / yield* 两侧注释
function* g() { yield /* c */ 1; }
function* g() { /* c */ yield 1; }
function* g() { /* c */ yield; }
function* g() { yield* /* c */ h(); }
function* g() { yield a /* c */ + b; }

// ===== 3. 优先级 =====
function* g() { return yield 1; }
function* g() { yield yield 1; }
function* g() { a = yield yield 2; }

// ===== 暂缓（不在本批）=====
// async generator          async function* f() {}      ← async/await 家族
// generator 表达式 / 方法   (function* () {});   ({ *m() {} });   ← function-expression / class element shapes
// 顶层 yield               yield;   yield 1;            ← TS 视为标识符/诊断，且 CanStart 不收 yield
// yield 后换行（受限产生式） function* g() { yield\n1; } ← TS 拆成「yield 无操作数 + 1;」，本块未按换行断句
