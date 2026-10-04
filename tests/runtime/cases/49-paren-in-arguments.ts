// 第 162 轮（运行层那一半）：**实参表里的括号是值位**。
//
// token 层原来把「括号前面是 `,` 或 `(`」一律判成**类型位**——那两条本来是给类型写的
//（`type F = (a: A, b: B) => C`、`[A, (B | C)]`），而实参表里也有逗号：
// `f("x", (a & b))` 里的 `a & b` 于是被当成**交叉类型**，降级层报
// `unimplemented: expression IntersectionType`（**整份文件进不来**）。
//
// 修法：只看**词法**——宿主 `(` 前面那一格是名字 / 方法 / 属性访问 / `)` / `]`，
// 它就是某次调用的实参表，那两个符号在里面只是分隔符与分组。
//
// parse 层那一半在 `tests/parse/cases/expressions/expr-paren-in-arguments.ts`
//（已进 `cases:tsast` 的语料，1430 → 1431）。

const a = 1;
const b = 2;
const obj = { m: (v: number) => v * 2, n: () => ({ k: 3 }) };

console.log("x", (a & b), "y");
console.log("x", (a | b), "y", (a ^ b));
console.log("x", (a + b) * 2, "y", (a > b) ? "gt" : "not");
console.log(obj.m((a | b)), obj.n().k, [1, 2].join(","), ((a | b) & 3));
console.log((a & b), "first", ((a ^ b) | 2));
