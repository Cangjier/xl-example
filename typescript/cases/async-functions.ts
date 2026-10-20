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

// ===== 嵌套 async function（暂缓：见文件末尾）=====
// async function f() { async function g() {} }
// async function f() { async function g() { await h(); } }

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

// 暂缓：嵌套 async function（`async function f() { async function g() {} }`）——同步嵌套
//   `function f() { function g() {} }` 已经能建，但函数体语句由 statements 的 StatementBuilder 分派，
//   它认 `function` 关键字、不认 `async` 前缀；async 分支属 statements/**（本块写范围之外），需那边补分派。
// 暂缓：async generator（`async function*`，需要 AsteriskToken + generator 语义）
// 暂缓：async method（class 成员，属 class extras 分支）
// 暂缓：泛型 async function（`async function f<T>() {}`，TypeParameter 在 types 家族后续）
// 暂缓：export 侧 `export async function`（cover-export-decls-2）
