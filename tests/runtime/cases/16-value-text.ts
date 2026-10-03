// 语料 16：**浮点的文本形态**与「任意值 → 文本」（第 124 轮）。
//
// 与 `node` 逐字节对拍。**这里能比什么、不能比什么，写清楚**：
//   · **能比**：浮点数（`console.log`、`join`、`JSON.stringify` 三处都是 `String(x)` 的口径 ✓）、
//     对象与数组走 **`join`**（JS 那边也是 `ToString` ✓ → `[object Object]` / `1,2` ✓）、
//     洞渲染成空串 ✓、`Math.sqrt` / `pow` 的结果 ✓；
//   · **不能比**：`console.log(对象)` —— Node 走的是 `util.inspect`（打印 `{ a: 1 }` ✗），
//     本仓是 `ToString` 的口径（`[object Object]` ✓）。那是**已记差异** ✓，所以这里不写它 ✓。

console.log("floats", 5 / 2, 7 / 4, 1 / 3, 0 - 5 / 2, 10 / 4);
console.log("math", Math.sqrt(2), Math.sqrt(16), Math.pow(2, 10), Math.pow(9, 1 / 2), Math.sqrt(0 - 1));
console.log("json", JSON.stringify(5 / 2), JSON.stringify([1 / 2, 2]), JSON.stringify({ half: 1 / 2 }));

const bag = { a: 1 };
console.log("join-object", [bag, [1, 2], "x", 5 / 2].join("|"));
const holed: number[] = [1, , 3];
console.log("join-hole", holed.join("-"), holed.join(), [].join("-"), [1].join("-"));
console.log("join-nested", [[1, 2], [3]].join(";"), [null, undefined, true].join(","));
console.log("after", 1 + 1);
