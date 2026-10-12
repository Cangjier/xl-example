// xl:title `toLocaleString` 那一格的**三处**还没到位：数字那一档与「转交给接收者自己的 toString」
// xl:round 689
// xl:judge stdout
// xl:want differ
// xl:why `Object.prototype.toLocaleString` 第 689 轮刚装上（普通对象那一档，见
//       `129-object-tolocalestring`），可规范里它的算法是
//       **`Invoke(O, "toString")`——O 是接收者本身**，于是：
//       ① 数字 / 字符串接收者要落到**它们自己的** `toString` 上
//          （`Object.prototype.toLocaleString.call(1)` 在 Node 里是 "1"），
//          而本仓 `ObjectToString` 那一支一律给 `[object Number]` / `[object String]`；
//       ② 带自定义 `toString` 的对象要**问它**（`{ toString() { return "T" } }.toLocaleString()`
//          Node 给 "T"），本仓给 `[object Object]`；
//       ③ `Number.prototype.toLocaleString` 那一格**属性表里根本没有**
//          （JS 带区域设置：`(1234.5).toLocaleString()` Node 给 "1,234.5" 的千分位分组）——
//          本仓没有区域设置那一层，补成 `toString` 会**静默给 "1234.5"**，比缺失更难查。
//       三条都是同一件事：**「转交给接收者自己」这一半没做**（不是补一格名字）。
// xl:end

console.log("call-num", Object.prototype.toLocaleString.call(1));
console.log("call-str", Object.prototype.toLocaleString.call("a"));
const custom: any = { toString() { return "T"; } };
console.log("custom", custom.toLocaleString());
console.log("num-member", typeof (Number.prototype as any).toLocaleString);
