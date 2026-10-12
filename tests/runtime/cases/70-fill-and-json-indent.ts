// 第 192 轮：**两条「静默错值」**——`Array.prototype.fill` 的后两个实参与
// `JSON.stringify` 的缩进参数，原来都被**整段忽略**。
//
// 两条都在普查表的 `DIFFER` 那一栏（「跑得出、值不对」）——最危险的一类：
// 脚本不报错、每一格单看都像对的，只有与 Node 逐字节比才看得出来。
//
// ① `arr.fill(值, 开始, 结束)`：JS 的口径是**两个都可以省**、
//    **负数从末尾数**、越界**夹住**、开始不小于结束就什么也不做。
//    原来它把整个数组都填上那个值——`[1,2,3,4].fill(0, 1, 3)` 给 `0,0,0,0`（Node 给 `1,0,0,4`）。
// ② `JSON.stringify(x, null, 2)`：第三、四个实参是**缩进**（数字＝空格个数，夹到 0..10；
//    字符串＝前十个字符），空对象 / 空数组照旧是 `{}` / `[]`。
//    原来那两位被忽略，永远给紧凑形状。

// ① `fill`：三段都量（省略 / 负数 / 负数区间）
const xs = [1, 2, 3, 4];
console.log(xs.fill(0, 1, 3).join(","));
console.log([1, 2, 3].fill(9).join(","));
console.log([1, 2, 3].fill(9, -1).join(","));
console.log([1, 2, 3].fill(9, 1, -1).join(","));
console.log([1, 2, 3].fill(9, 5).join(","), [1, 2, 3].fill(9, 2, 1).join(","));
console.log([1, 2, 3].fill(9, -99, 99).join(","), [].fill(1).length);
// `fill` 改的是**原数组**，返回值也是它（`===` 成立）
const same = [1, 2, 3];
console.log(same.fill(7, 0, 1) === same, same.join(","));

// ② `JSON.stringify` 的缩进（对象 / 数组 / 嵌套 / 空容器 / 字符串缩进）
console.log(JSON.stringify({ a: 1, b: [1, 2] }, null, 2));
console.log(JSON.stringify([1, 2], null, 4));
console.log(JSON.stringify({ a: {}, b: [] }, null, 2));
console.log(JSON.stringify({ a: 1, b: 2 }, null, 99));
console.log(JSON.stringify({ a: 1 }, null, "\t"));
// 不给缩进照旧是紧凑形状（回归）
console.log(JSON.stringify({ a: 1, b: [1, 2] }));
console.log(JSON.stringify({ a: 1 }, null, 0));
