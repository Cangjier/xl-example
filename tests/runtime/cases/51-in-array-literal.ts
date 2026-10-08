// 第 165 轮（运行层那一半）：值位数组里的 `in` 是二元运算符。
//
// 原来 `[x in y, 2]` 被判成**映射键**（整个数组投成 `TypeParameter`），
// 于是降级层报 `unimplemented: expression TypeParameter`（整份文件进不来）。
// 修法见 `tests/cases/token/expressions/expr-in-array-literal.ts` 的注。
//
// 类型位那一半（映射类型 / 键重映射 / 嵌套映射键）在同名那条 parse 用例里，
// 已经进 `cases:tsast` 的语料。

const obj = { a: 1, b: 2, c: 3 };
const arr = [10, 20, 30];

// ① 数组字面量里的 `in`（原来整份文件失败的那一条）
console.log(["a" in obj, "z" in obj, 2]);
console.log([1 in arr, 5 in arr]);
console.log([("a" in obj), ("z" in obj)]);

// ② 嵌套与混写
console.log([[("b" in obj)], 3]);
console.log(["a" in obj && "b" in obj, ("z" in obj) || false]);
console.log(["a" in obj ? "yes" : "no", 0 in arr, 2 in arr]);

// ③ 与其它运算符一起（回归）
console.log([1 + 2, "a" in obj, 3 * 4]);
console.log([...["x" in obj], "m" in obj]);
