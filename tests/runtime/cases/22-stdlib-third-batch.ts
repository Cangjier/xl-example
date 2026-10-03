// 语料 22：标准库第三批（第 130 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// 这一批补的是**日常代码里最常写的几个静态方法与数组方法**，每一个都各自独立：
// `Array.findIndex` · `Array.from` · `Object.assign` · `String.fromCharCode` ·
// `String.replace`（只做字符串找字符串）· `new Map([[k, v], …])` · `new Set([…])`。
//
// **没做、也不在这里假装做的**（各自记在台账里）：
//   · `reduce` / `sort` —— 它们的回调要**两个实参**（累计与当前值），
//     而回调通道 `NativeCall` **只带一个**（与 `Map.forEach` 不传键是同一条限制）；
//   · `Array.from(生成器)` —— 走完生成器要发 `iter_next`，那是**指令**，建库层够不着；
//   · `String.replace` 的**正则实参 / 函数实参** —— 两样都依赖还没有的东西，会**响亮地抛**；
//   · `String(x)` / `Number(x)` / `Boolean(x)` —— 那要求一个值**既是对象又是可调用的**，
//     值模型今天只有两半里的各一半（`String` 现在只是**静态方法之家**）。

console.log("findIndex", [1, 2, 3].findIndex((n) => n > 1), [1, 2, 3].findIndex((n) => n > 9),
  [].findIndex((n) => n > 0));
console.log("from-string", Array.from("abc").join("-"), Array.from("").length);
console.log("from-array", Array.from([1, 2]).join(","), Array.from([1, , 3]).length,
  1 in Array.from([1, , 3]));
console.log("from-map-set", Array.from(new Map([[1, "a"]])).length, Array.from(new Set([1, 2])).join(","));
console.log("map-entries", new Map([[1, "a"], [2, "b"]]).size, new Map([[1, "a"], [1, "c"]]).get(1));
console.log("map-from-entries", new Map(Object.entries({ x: 1, y: 2 })).size);
console.log("set-initial", new Set([1, 2, 2, 3]).size, Array.from(new Set([3, 1, 3])).join(","));
console.log("assign", Object.assign({}, { a: 1 }, { b: 2 }).b, Object.assign({ a: 1 }, { a: 2 }).a);
console.log("assign-null", Object.assign({ a: 1 }, null).a, Object.assign({ a: 1 }, undefined, { b: 2 }).b);
console.log("charCode", String.fromCharCode(65, 66, 67), String.fromCharCode().length);
console.log("replace", "a-b-c".replace("-", "+"), "aaa".replace("a", "b"), "abc".replace("z", "y"));
console.log("replace-empty", "ab".replace("", "-"));
console.log("after", 1 + 1);
