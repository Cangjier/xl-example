// bindings 用例集：array / object binding pattern 与 binding element，经变量语句 / for-of 测量。
// 一行一个用例；行内 \n 由 ast-json.mjs 还原成真实换行（多行语句因此也能逐行对齐）。
// 快照：node typescript/cases/ast-json.mjs bindings && node typescript/cases/ast-json-diff.mjs bindings
//
// 覆盖范围（docs/coverage-bindings.md）：
//   B1 array binding pattern 基础（含空模式 `[]`）；
//   B2 object binding pattern 基础（含空模式 `{}`）与改名 `a: b`；
//   B3 嵌套 pattern；
//   B4 默认值（array / object / 嵌套内）；
//   B5 rest（array / object）；
//   B6 空位 OmittedExpression（`[a, , b]`、`[, a]`）；
//   B7 for-of；
//   B8 trivia（前导 / 元素间 / 冒号两侧 / 等号两侧 / 行内换行）。
//
// 暂缓（原因见 docs/coverage-bindings.md）：字面量名 `{ "s": a }`（同 members 的 ParseName 缺口）、
// computed name `{ [k]: a }`（ComputedPropertyNameShape，types 家族）、for-in 解构（TS 语法不允许）。

// ===== base 1：array binding pattern 基础 =====
let [a, b] = x;
let [a] = x;
let [a, b, c] = x;
let [ a , b ] = x;
let [] = x;

// ===== base 2：object binding pattern 基础 =====
let { a, b } = x;
let { a } = x;
let { a: b } = x;
let { a: b, c: d } = x;
let {} = x;

// ===== base 3：嵌套 pattern =====
let [[a], b] = x;
let [{ a }] = x;
let { a: { b } } = x;
let { a: [b, c] } = x;
let [{ a }, { b }] = xs;

// ===== base 4：默认值 =====
let [a = 1] = x;
let [a, b = 1] = x;
let { a = 1 } = x;
let { a: b = 1 } = x;
let [{ a = 1 }] = x;

// ===== base 5：rest =====
let [...a] = x;
let [a, ...b] = x;
let { ...a } = x;
let { a, ...b } = x;

// ===== base 6：空位（OmittedExpression）=====
let [a, , b] = x;
let [, a] = x;
let [a, , , b] = x;

// ===== base 7：for-of / for-in =====
for (const [a, b] of xs) a;
for (const { a } of xs) a;

// ===== base 8：trivia =====
let [/* c */ a, /* d */ b] = x;
let { /* c */ a, /* d */ b } = x;
let { a /* c */ : b } = x;
let [a /* c */ = 1] = x;
let [a, /* c */ ...b] = x;
let {\na,\nb\n} = x;
let [a,\nb] = x;
let { a: b = /* c */ 1 } = x;
let [ /* c */ ] = x;
let { /* c */ } = x;
