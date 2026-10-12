// 语料 07：集合（Map / Set / Symbol 当键 / 直接迭代 Map 与 Set）。
//
// **已知差异**（写在台账里）：
//   - `forEach` 的回调**只拿到值**（这条引擎的回调通道一次带一个实参），
//     所以这里一律写 `(v) => …`，不写 `(v, k, m)`——那样两边拿到的参数个数就不同了；
//   - `keys()` / `values()` / `entries()` 在本仓给的是**数组**，JS 给的是**迭代器**——
//     数组有 `.join`、迭代器没有，所以这一份**只用 `for..of` 读它们**
//     （两边都能跑，也正是 JS 里那种写法的日常形状）；`.join` 留给真正的数组。

const counts = new Map();
counts.set("a", 1);
counts.set("b", 2);
counts.set("a", 3);
console.log("map-basic", counts.size, counts.get("a"), counts.get("zz") === undefined, counts.has("b"), counts.has("zz"));

let sum: number = 0;
counts.forEach((value) => {
  sum = sum + value;
});
console.log("map-forEach", sum);

let walked: string = "";
for (const value of counts.values()) {
  walked += value + ",";
}
console.log("map-values", walked);

let pairs: string = "";
for (const entry of counts) {
  pairs += entry[0] + "=" + entry[1] + ";";
}
console.log("map-iterate", pairs);
let byKeys: string = "";
for (const key of counts.keys()) {
  byKeys += key + "|";
}
console.log("map-keys", byKeys);

counts.delete("a");
console.log("map-delete", counts.size, counts.has("a"));
counts.clear();
console.log("map-clear", counts.size);

const uniq = new Set();
uniq.add(1);
uniq.add(1);
uniq.add(2);
console.log("set-basic", uniq.size, uniq.has(1), uniq.has(9));
let total: number = 0;
uniq.forEach((value) => {
  total = total + value;
});
console.log("set-forEach", total);
let seen: string = "";
for (const value of uniq) {
  seen += value + "-";
}
let setValues: string = "";
for (const value of uniq.values()) {
  setValues += value + "+";
}
console.log("set-iterate", seen, setValues, uniq.delete(1), uniq.size);

// Symbol 当属性键：身份唯一、Object.keys 跳过它。
const tag = Symbol("tag");
const other = Symbol("tag");
const boxed = { plain: 1 };
boxed[tag] = "hidden";
console.log("symbol", tag === tag, tag === other, typeof tag, boxed[tag], Object.keys(boxed).join(","));
