// xl:title 迭代器**就是数组**那一格（第 725 轮登记的模型差）
// xl:round 725
// xl:judge stdout
// xl:want differ
// xl:why **本仓的迭代器就是那个数组**（游标 `__i` 与 `next` 挂在数组身上，第 279 / 331 轮）：
// xl:why `Array.isArray(it)` 给真、`it.constructor.name` 给 `"Array"`、
// xl:why `it.map(f)` 命中的是 `Array.prototype.map`（**急切**、返回数组），而 JS 里它是一条
// xl:why 惰性的迭代器。**这是写在明处的取舍**：引擎的迭代只认数组与生成器，
// xl:why 换成「对象 + next」会把 `[...it]` / `for..of` / `Array.from` 一起弄坏。
// xl:why 第 725 轮给这一层补的是**数组上没有的那三个名字**（`take` / `drop` / `toArray`，
// xl:why 见 `p725a-a01` … `a05`）——它们不依赖「换表示」这件事，所以能单独收。
// xl:end
const it: any = [1, 2, 3].values();
console.log(Array.isArray(it), it.constructor.name, Object.getPrototypeOf(it) === Array.prototype);
console.log(Array.isArray(it.map((x: number) => x * 2)));
console.log(Object.prototype.toString.call(it));
console.log(Object.keys([1, 2, 3].values()).join(","), JSON.stringify([1, 2].values()));
