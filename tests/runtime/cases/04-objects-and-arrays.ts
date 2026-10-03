// 语料 04：对象与数组（字面量、访问器、计算键、解构、下标、delete、JSON、Object.keys）。

const point = { x: 1, y: 2 };
console.log("literal", point.x, point["y"]);

const nested = { inner: { deep: { value: 7 } }, list: [1, 2, 3] };
console.log("nested", nested.inner.deep.value, nested.list[1], nested.list.length);

// 方法 / 计算键 / 简写 / 访问器。
const key: string = "computed";
const name: string = "shorthand";
const bag = {
  [key]: 11,
  name,
  plain(multiplier: number): number {
    return 3 * multiplier;
  },
  get doubled(): number {
    return this.base * 2;
  },
  set doubled(value: number) {
    this.base = Math.floor(value / 2);
  },
  base: 5,
};
console.log("members", bag.computed, bag.name, bag.plain(4), bag.doubled);
bag.doubled = 30;
console.log("setter", bag.base, bag.doubled);

// 解构（对象 / 数组 / 重命名 / 洞）。**默认值与剩余未收**，不写。
const { x, y } = point;
const { x: renamed } = point;
const [first, , third] = [10, 20, 30];
console.log("destructure", x, y, renamed, first, third);

// 数组方法：改的（push / pop）与不改的（join / indexOf / slice）分开看。
const items: number[] = [1, 2, 3];
items.push(4);
const popped = items.pop();
console.log("array-ops", items.join("-"), popped, items.indexOf(3), items.indexOf(99), items.slice(0, 2).join(","));
console.log("array-search", items.find((v) => v > 1), items.some((v) => v > 3), items.every((v) => v > 0));

// 下标写入 + delete（`delete` 走的是引擎那条 `DelProp`）。
const grid: number[][] = [[1, 2], [3, 4]];
grid[1][0] = 9;
console.log("index", grid[1][0], grid[0].length);
const removable = { keep: 1, drop: 2 };
delete removable.drop;
console.log("delete", removable.keep, removable.drop === undefined, Object.keys(removable).join(","));

// 序列化：整数 / 字符串 / 布尔 / null / 数组 / 嵌套对象。
console.log("json", JSON.stringify({ a: 1, b: "two", c: true, d: null, e: [1, 2], f: { g: 3 } }));
console.log("json-array", JSON.stringify([1, "x", false, null]));
console.log("keys", Object.keys({ p: 1, q: 2 }).join("+"));
