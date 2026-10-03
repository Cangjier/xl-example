// 语料 25：函数那一半的展开与剩余（第 133 轮）——stdout 与 `node <本文件>` 逐字节对拍。
//
// **这一份的来历**：上一轮把字面量那一半做掉了（`[...xs]` / `{...o}` / 绑定模式默认值），
// 剩下的是**函数那一半**——而它**要动引擎**：
//   · `Op.Call` 收的是**从某格开始的一段连续槽 + 一个定长个数** ✗，
//     而 `f(...xs)` 的个数**只有运行期才知道** ✗；
//   · 剩余参数要「把多出来的实参收成数组」✗，而那些实参在**被调方自己的帧里没有格子** ✗
//     （`SlotCount` 定长 ✓、调用方传几个编译期不知道 ✓）。
//
// 第 133 轮加了两样：
//   · **`Op.CallArray`**（第 22 个算子 ✓，追加在 `caught` 之后 ✓）——按一个数组铺开参数 ✓；
//   · **`FunctionInfo.HasRest`** 那一位（借 flags 字节的第 3 位 ✓）——
//     **开帧的人**顺手把剩余收成一个数组放进最后一格 ✓，**一条新算子都不用加** ✓。
//
// **语料里避开的**（各自记着，不是漏测）：
//   · `new C(...xs)` 与 `super(...xs)` / `super.m(...xs)` —— `CallArray` 没有「构造目标」
//     与「在谁身上找」那两个操作数，各是**另一轮**的事，现在**响亮地抛**；
//   · `宿主能力名(...xs)`（没声明过、直接登记为能力的名字）——它的窗口 `[号, 参数…]`
//     是定长的，同样是另一轮；
//   · `it.next()`（生成器迭代器上的方法调用）——**更早就记着**的一条缺口；
//   · **函数声明写在函数表达式 / 箭头函数的体里** —— 这一轮**新量出来**的一条
//     （`function () { function f() {} }` 报 `statement FunctionExpression` ✓）：
//     它在**投影层**就歪了、与展开剩余无关 ✓。所以这一份里的辅助函数一律写成
//     **顶层函数声明** ✓，不写成箭头 IIFE ✓。

function restBasic(a, ...rest) { return a + ":" + rest.length + ":" + rest.join(","); }
function restOnly(...all) { return all.join("-"); }
function restDefault(a = 1, ...r) { return a + "/" + r.join(","); }
function restCount(...r) { return r.length; }
const restArrow = (...r) => r.join("+");
const restObject = { m(...r) { return r.length; } };
class RestClass { m(a, ...r) { return a + r.length; } }
function* restGenerator(...r) { yield r.length; }

function captured() {
  const base = 5;
  const f = (...r) => r.map((x) => x + base).join(",");
  return f(1, 2);
}

function spreadCall(a, b, c) { return [a, b, c].join("-"); }
function spreadJoin(...r) { return r.join(","); }
function spreadForward(...r) { return spreadJoin(...r); }
function spreadOne(a) { return a; }
function product(a, b) { return a * b; }
const spreadObject = { m(a, b) { return a * b; } };

console.log("rest-basic", restBasic(1, 2, 3), restBasic(1), restBasic(1, 2));
console.log("rest-only", restOnly(1, 2), "/", restOnly(), "/", restOnly("a"));
console.log("rest-default", restDefault(), "/", restDefault(2), "/", restDefault(2, 3, 4));
console.log("rest-shapes", restCount(1, 2, 3), restArrow(1, 2), restObject.m(1, 2, 3),
  new RestClass().m(1, 2, 3), captured());
console.log("rest-generator", (() => {
  let out = "";
  for (const x of restGenerator(1, 2, 3)) out = out + x;
  return out;
})());
console.log("spread-call", spreadCall(...[1, 2, 3]), spreadCall(1, ...[2, 3]), spreadCall(...[1]));
console.log("spread-host", Math.max(...[3, 1, 2]), Math.min(...[3, 1, 2]));
console.log("spread-method", (() => {
  const arr = [];
  arr.push(...[1, 2, 3]);
  const key = "m";
  return [arr.length, arr.join(","), spreadObject.m(...[3, 4]), spreadObject[key](...[5, 6])].join(" | ");
})());
console.log("spread-nested", spreadForward(1, 2, 3), "/", spreadForward(), "/", spreadJoin(...[]));
console.log("spread-not-iterable", (() => {
  try {
    const bad = spreadOne(...5);
    return "no-throw";
  } catch (error) {
    return "caught";
  }
})());
console.log("after", 1 + 1);
