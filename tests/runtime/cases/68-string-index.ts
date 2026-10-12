// 第 190 轮：**字符串接收者上的下标读**（`s["length"]` / `s["0"]` / `s[0]`）。
//
// 这一轮是普查之外、**自己量出来**的一条：`"abc"["length"]` 与 `"ab"["length"]` 都报
// `unimplemented: non-numeric index needs ToString` ——**整份文件进不来**。
//
// 根因在引擎那一格：`get_index` 见到**字符串接收者**就**无条件**转给
// `props.GetIndex`，而那一支只认**数字键**（它给的是「一个码元的字符串」）。
// JS 的口径是「把它当成对象、按属性查」（`ToObject`）：
//   · `"abc"["length"]` → `3`；
//   · `"abc"["charAt"]` → 一个函数（原型链上找）；
//   · `"abc"["x"]` → `undefined`；
//   · `"abc"[0]` / `"abc"["0"]` → `"a"`（**数字键与「全是数字的字符串键」都是下标**）。
//
// 修法：数字键照旧走「一个码元」那条路；**「全是数字的字符串键」先换成数字**再走同一条；
// 其余的键走**属性**那条路。

const s: any = "abc";

// ① 数字下标（这一支一直是好的）
console.log(s[0], s[2], s[5]);

// ② 不是下标的键：`length` 与原型上的方法
console.log(s["length"], typeof s["charAt"], s["charAt"](1));
console.log(s["nope"]);

// ③ 「全是数字的字符串键」也是下标
console.log(s["0"], s["2"], s["9"]);

// ④ 字面量接收者与小数下标（`1.0` 就是 `1`）
console.log("xyz"[1], s[1.0], s[1.5]);

// ⑤ 解构与迭代那两条路用的也是下标读，一起回归
const [a, b] = s;
console.log(a, b);
for (const ch of "hi") console.log("iter", ch);
