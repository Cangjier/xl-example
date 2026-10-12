// 第 199 轮：**生成器进得了每一个「急切」的入口**。
//
// 普查里 `spread-generator` 那一条：`[...g()]` 报
// `unimplemented: spreading a value that is not an array, a string, a Map or a Set`
// ——**整份文件进不来**。
//
// 根因是一条**分层边界**：走完一个生成器要发 `iter_next`，那是**指令**，
// 不是建库层能调的函数。`GetIterator` 对生成器**原样返回**（那正是 `for..of` 那条
// **惰性**路要的形状），于是所有**急切**的入口都落到「其它」那一支抛。
//
// 修法：**引擎把那张「走完迭代器」的服务递下来**（`DrainIterator` / `IteratorDrainer()`），
// 语言层照旧不碰指令。四个急切入口各接上它：解构（`const [a, b] = g()`）、
// 展开（`[...g()]`）、`Array.from(g())`、`new Set(g())` / `new Map(g())`。
// **`for..of` 一个字都不改**（它必须是惰性的：`break` 只该走那么远）。
//
// 顺带修掉一处**实测到的潜伏 bug**：语言层自己造的中间数组**没有根保护**——
// `[...一个 6 万项的 Symbol.iterator]` 报 `invalid handle`（数组被回收器收走了）。
// 引擎因此多了一格「临时根」（`Temps`）与那个开关（`RootKeeper()`）。
//
// 留在明处的两条：① 函数 → 源码文本（`f + 1`）仍抛；② `Array.from({a:1})`
// （既没有迭代器、也没有 `length`）仍抛，而 JS 给空数组。

function* numbers(): Generator<number> {
  yield 1;
  yield 2;
  yield 3;
}

// ① 展开
console.log([...numbers()].join(","));
console.log([0, ...numbers(), 9].join(","));

// ② 解构（声明与赋值两半）
const [a, b] = numbers();
console.log(a, b);
const [head, ...tail] = numbers();
console.log(head, tail.join("-"));
let x: number, y: number;
[x, y] = numbers();
console.log(x, y);

// ③ Array.from（含映射函数）
console.log(Array.from(numbers()).join("|"));
console.log(Array.from(numbers(), (n: number) => n * 10).join("|"));

// ④ 函数的展开实参（含宿主能力）
function sum(...xs: number[]): number {
  return xs.reduce((m: number, n: number) => m + n, 0);
}
console.log(sum(...numbers()), Math.max(...numbers()));

// ⑤ 集合的初值
console.log(new Set(numbers()).size, [...new Set(numbers())].join(","));
const pairs: Array<[string, number]> = [["k", 1]];
console.log([...new Map(pairs).keys()].join(","));

// ⑥ `for..of` 仍旧是**惰性**的（它没走那张 drain）
let seen = "";
for (const n of numbers()) {
  seen += n;
  if (n === 2) break;
}
console.log(seen);

// ⑦ 一个生成器被消费两次（同一个生成器对象走完就是走完了）
function* once(): Generator<number> {
  yield 7;
}
const g = once();
console.log([...g].join(","), [...g].join(","), Array.from(g).length);

// ⑧ 混着来：宿主集合 + 生成器 + 字符串
console.log([...new Set(numbers()), ..."ab"].join(","));

// ⑨ `Array.from` 的数组式那一档照旧（回归）
console.log(Array.from({ length: 3 }, (_: unknown, i: number) => i).join(","));

// ⑩ **`yield*` 还抛**（`unimplemented: yield* (delegating iteration)`）——
// 它是**另一件事**（要按 `iter_next` 惰性转发 ✓，不是这一轮那张 drain ✓），
// 所以这一轮**不写进语料** ✓，记在台账里 ✓。
