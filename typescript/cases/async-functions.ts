// async function declarations：AsyncKeyword 子节点 + await 体 + trivia + ASI 拆分。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行。
// Oracle（TS）：FunctionDeclaration children = [AsyncKeyword, Identifier, (Parameter|TypeParameter)*, ReturnType?, Block?]；
// AsyncKeyword 区间 = async token，Pos = 前一个非 trivia 单元 End+1。

// ===== base =====
async function f() {}
async function g() {}
async function f(a: A): B { return a; }
async function f() { await g(); }
async function f() { return await g(); }
async function f() { await g(); return await g(); }
declare async function f(): void;

// ===== 嵌套 async function（体内声明；StatementBuilder 分派 async + function）=====
async function f() { async function g() {} }
async function f() { async function g() { await h(); } }
async function f() { async function g() { await h(); } return g; }
async function f() { async function g(): void {} }
async function f() { async function g(a: A): B { return a; } }
async function f() { async function g(a: A): B; }
function f() { function g() {} }
function f() { function g(a: A): B { return a; } }
async function f() { function g() {} }
function f() { async function g() {} }
async function f() { let x = 1; async function g() {} return g; }
async function f() { async function g() { async function h() {} } }
{ async function f() {} }
if (a) { async function f() {} }
while (a) { async function f() {} }
{ async function f() {} let x = 1; }
async function f() { /* c */ async function g() {} }
async function f() { async /* c */ function g() {} }
class C { m() { async function f() {} } }
class C { async m() { async function f() { await g(); } } }
class C { m() { function g() {} async function f() {} } }

// ===== trivia =====
/* c */ async function f() {}
async /* c */ function f() {}
async function /* c */ f() {}
async function f(a /* c */: A) {}
async function f() { /* c */ await g(); }
async function\nf() {}
async function f() /* c */ {}
async function f(a: A): /* c */ B { return a; }

// ===== ASI：async 与 function 之间换行（TS 拆成 ExpressionStatement(async) + FunctionDeclaration）=====
async\nfunction f() {}
async\nfunction f(a: A): B { return a; }

// ===== 重复形 / 混排 =====
async function f() {}\nasync function g() {}
async function f() {}\nfunction g() {}
let x = 1;\nasync function f() {}
async function f() {}\nlet x = 1;
declare async function f(): void;\nasync function g() {}

// ===== async generators（`async function*`；children = AsyncKeyword, AsteriskToken, Identifier, …）=====
async function* f() {}
async function* f() { yield 1; }
async function* f() { await g(); yield await h(); }
async function* f() { yield 1; yield 2; }
async /* c */ function* f() {}
async function /* c */ * f() {}
async function* f() { /* c */ yield 1; }
async function* f() {}\nasync function* g() {}
async function f() { async function* g() {} }
async function* f() { async function* g() { yield 1; } }

// ===== for await（ForOfStatement 的 AwaitKeyword）=====
async function f() { for await (const x of xs) {} }
async function f() { for await (const x of xs) { await g(); } }
async function f() { for await (const [a] of xs) a; }
async function f() { for await (const {a} of xs) a; }
async function f() { for await (x of xs) {} }
async function f() { for /* c */ await (const x of xs) {} }
async function f() { for await /* c */ (const x of xs) {} }
async function f() { for await (const x of xs) /* c */ {} }
async function* f() { for await (const x of xs) yield x; }
for await (const x of xs) {}

// 暂缓：async method（class 成员，属 class extras 分支）
// 暂缓：泛型 async function（`async function f<T>() {}`，TypeParameter 在 types 家族后续）
// 暂缓：export 侧 `export async function`（cover-export-decls-2）
// 说明：class 方法体内的嵌套 async function 依赖 class 方法体是否走 StatementBuilder（本块不改 class 文件）；
//   module/namespace 块体由 module-block builder 负责，同样不在本块范围。
