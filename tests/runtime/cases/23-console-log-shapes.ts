// 语料 23：`console.log` 的形状（第 131 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：Node 的 `console.log` **不走 `ToString`** ✗，走的是 `util.inspect` ✓——
// `console.log([1, 2])` 印 `[ 1, 2 ]` ✓、`console.log({ a: 1 })` 印 `{ a: 1 }` ✓、
// 数组里的字符串带**单引号** ✓。本层原来印的是 `1,2` / `[object Object]` / 裸的 `a` ✗，
// 于是**任何 `console.log(数组 / 对象)` 的普通程序都对不齐 stdout** ✗。
// 第 131 轮补上 `builtins/inspect.xl.md`，这一份逐条量它。
//
// **语料里避开的两处**（各自的理由写在 `inspect.xl.md` 的「已知差」表里）：
//   · **整数样式的键**（`{ 1: 'x' }`）—— JS 把它们排到最前，本仓一律按插入顺序；
//   · **循环引用** —— Node 给 `<ref *1> … [Circular *1]`，本仓靠深度上限收成 `[Array]`；
//   · **嵌套很深的容器** —— 折行预算在嵌套里 Node 更宽，本仓统一用顶层那条规则。

console.log("scalars", 1, 1.5, -2.5, true, false, null, undefined);
console.log("strings", "a", "a b", "it's", 'say "hi"', "");
console.log("empty", [], {});
console.log("array", [1, 2, 3]);
console.log("array-str", ["a", "b"]);
console.log("array-mixed", [1, "a", true, null, undefined]);
console.log("array-nested", [[1, 2], [3]]);
console.log("array-holes", [1, , 3], [1, , , 4]);
console.log("object", { a: 1 });
console.log("object-str", { a: "b" });
console.log("object-nested", { a: { b: 1 } });
console.log("object-keys", { "a-b": 1, a$b: 3, abc: 4, a_b: 5 });
console.log("mixed", { a: [1, "x"], b: { c: null } });
console.log("depth", { a: { b: { c: { d: 1 } } } }, [[[[1]]]]);
console.log("wrapped-7", [0, 1, 2, 3, 4, 5, 6]);
console.log("wrapped-12", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
console.log("wrapped-20", [0, 100, 200, 300, 400, 500, 600, 700, 800, 900,
  1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900]);
console.log("object-many", { k0: 0, k1: 1, k2: 2, k3: 3, k4: 4, k5: 5,
  k6: 6, k7: 7, k8: 8, k9: 9, k10: 10, k11: 11 });
console.log("map", new Map([[1, "a"], [2, "b"]]));
console.log("set", new Set([1, 2]));
console.log("date", new Date(0), new Date(-1));
console.log("symbol", Symbol("s"));
console.log("multi", "a", [1, 2], { x: 1 });
// **105 项那个用 `push` 造** ✗ 不用 `Array.from({length: n}, fn)`：
// 后者是「类数组 + 映射函数」那条路，本仓的 `Array.from` 只做数组 / 字符串 / `Map` / `Set`
// （`install.xl.md` 的 `ArrayFromValues` 把边界写在明处）——那是另一条已记缺口。
const many = [];
for (let i = 0; i < 105; i++) many.push(i);
console.log("truncated", many);
console.log("after", 1 + 1);
