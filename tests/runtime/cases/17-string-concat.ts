// 语料 17：**字符串拼接**（第 125 轮）——与 `node` 逐字节对拍。
//
// `+` 里只要有一边是**字符串字面量**，降级层就把它落成一条语言内建调用
// （`StringConcat` ✓），于是另一边走「任意值 → 文本」（第 124 轮那条 ✓）：
// 对象给 `[object Object]`、数组按 `,` 连、浮点最短往返、`null`/`undefined`/布尔照文字给。
//
// **这一份钉的是那一种形状** ✓；两边都是变量（`a + b`）时照旧走引擎 ✓——
// 运行期真遇到对象会**抛** ✓（响亮，不是静默给错值 ✗），那一条写在判据里、不在语料里 ✗。

const bag = { a: 1 };
const arr: number[] = [1, 2];

console.log("object", "x=" + bag, bag + "!");
console.log("array", "a" + arr, arr + "!");
console.log("float", "n=" + 5 / 2, 5 / 2 + "!");
console.log("nullish", "x" + null, "y" + undefined, "z" + true);
console.log("number-first", 1 + "x", 2 + "y" + 3, 5 / 2 + " half");
// **一处刻意绕开的写法** ✗：模板串里带**数字字面量**、而且它**不是第一个实参**时，
// 投影会把它读成**类型位** ✓、降级层于是报 `expression LiteralType` ✓
// （最小复现：`console.log('x', \`a=${1}\`)` ✓；写成 `const v = \`a=${1}\`; console.log('x', v)` 就好 ✓）。
// 那是**投影**那条「值位 / 类型位」判据的缺口 ✓（与第 123 轮 `[1 in arr]` 被读成映射类型同一族 ✓，
// 都**响亮地抛** ✓、不是静默给错值 ✓），所以这里先算进变量 ✓。
const rendered = `t=${bag} ${arr} ${5 / 2}`;
console.log("template", rendered);

let message = "start";
message += "-more";
console.log("compound", message, message += "-end");
console.log("after", 1 + 1);
