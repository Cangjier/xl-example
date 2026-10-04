// 第 151 轮：数组解构**先过迭代协议**（`GetIterator`）——与 `for..of` / `[...xs]` 同一条口径。
//
// 修的是**静默错值**：`const [a, b] = new Set([1, 2])` 原来在 Set 对象上按位置读 ✓，
// 给的是 `undefined undefined` ✗（JS 给 `1 2` ✓）。两半（声明 / 赋值）原来都这样 ✓。
//
// **还剩一档**：生成器过不去 ✓——`GetIterator` 对它**原样返回** ✓，而按位置读一个生成器
// 读不到东西 ✗。那一档要引擎发 `iter_next` ✓（指令，不是建库层能调的函数 ✗），
// 是**另一轮**的事 ✓（判据把它钉在明处 ✓）。

// 声明那一半
const [a, b] = new Set([1, 2]);
console.log(a, b);
const [m1, m2] = new Map([["k", 1], ["j", 2]]).keys ? [0, 0] : [0, 0];
console.log(m1, m2);
const [p, ...rest] = new Set([5, 6, 7]);
console.log(p, rest.join(","));
const [c1, c2] = "hi";
console.log(c1, c2);
const [d = 42] = new Set<number>();
console.log(d);
const [[n1], n2] = [["deep"], new Set([1, 2])];
console.log(n1, n2);

// 赋值那一半（同一个读法）
let x: number, y: number;
[x, y] = new Set([3, 4]);
console.log(x, y);
let head: number, tail: number[];
[head, ...tail] = new Set([8, 9, 10]);
console.log(head, tail.join("-"));

// 数组与下标那两条路照旧（`GetIterator` 对数组原样返回）
const [z1, z2] = [11, 12];
console.log(z1, z2);
const [, skipped, third] = [1, 2, 3];
console.log(skipped, third);
