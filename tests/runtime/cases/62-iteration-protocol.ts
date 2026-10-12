// 第 184 轮：**迭代协议**（`Symbol.iterator` 那一格真的被认了）。
//
// 第 183 轮把 `{ [Symbol.iterator]() { … } }` 这个**语法**做出来了 ✓、
// `Symbol.iterator` 那个**符号**也有了 ✓——但 `[...o]` / `for..of` 仍旧报
// 「不是一个数组 / 字符串 / Map / Set」✗：**协议那一半没做** ✗。
//
// `GetIterator`（语言层那条总入口，`for..of` / 展开 / `Array.from` 都走它）原来只认
// 四种输入：Map 的 `__k`、Set 的 `__v`，以及「原样交回引擎」的数组 / 字符串 / 生成器。
// 这一轮补上第五种：**按 `Symbol.iterator` 走协议**——
//
//   取那一格方法 → 调它拿到迭代器 → 反复读 `next()` 的 `{value, done}` → 收集成数组。
//
// **为什么收集成数组**：引擎的 `iter_next` 只认数组与生成器（那是引擎的算子），
// 所以语言层把协议跑完、交一个数组回去——与 Map / Set 那两条同一个手法。
//
// **判断顺序是语义**：JS 里 `Symbol.iterator` **先于** `length` 那一档——
// 一个既有 `length` 又有 `Symbol.iterator` 的对象按**协议**走。
// 这一条判据钉在下面第 ①：两处（`[...o]` 与 `Array.from(o)`）必须给同一个答案。

// ① 协议优先于「数组式」（`length` 那一档）
const both: any = {
  length: 9,
  [Symbol.iterator]() {
    let i = 0;
    return { next: () => (i < 2 ? { value: "x" + i++, done: false } : { done: true }) };
  },
};
console.log([...both].join(","), Array.from(both).join(","), both.length);

// ② 迭代器产出的 `undefined` 是**真的值**（不是洞）
const undef: any = {
  [Symbol.iterator]() {
    let n = 0;
    return { next: () => (n++ < 2 ? { value: undefined, done: false } : { done: true }) };
  },
};
const spread = [...undef];
console.log(spread.length, spread[0] === undefined, Array.from(undef).length);

// ③ 没有迭代器的「数组式」对象照旧按下标读（Array.from 那一档不变）
const arrLike: any = { length: 2, 0: "a", 1: "b" };
console.log(Array.from(arrLike).join(","));

// ④ 原来那几档一个都不能少：字符串 · Set · Map · 生成器的 for..of · 数组方法
console.log([..."ab"].join(","), Array.from("ab").join(","), [...new Set([1, 2, 2])].join(","));
const m = new Map([["k", 1]]);
console.log([...m].length, [...m][0][0], [...m][0][1]);
function* g() { yield 1; yield 2; }
for (const v of g()) console.log("gen", v);
console.log([1, 2, 3].map((x) => x * 2).join(","));
