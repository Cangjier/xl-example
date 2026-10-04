// 第 200 轮：**语言层手里的中间值要有根**。
//
// 这一条不是「某个语法没通」✗，而是一处**只在堆压满时才现形**的静默错值 ✗：
// 语言层「手里拿着一个堆引用 → 调一次脚本 / 问一次分配前那道闸门 → 再用它」这个形状，
// 中间**有一个真实的窗口**——回收器只看 `SnapshotRoots` 那张名单（帧栈 / 常量 /
// 原型表 / 待处理异常 …），而**语言层自己造出来的东西不在里面**。
//
// 实测（第 199 轮抓到的第一处）：`[...一个 6 万项的 Symbol.iterator]` 报
// `invalid handle: 322`——结果数组被收走了，`Push` 落在死句柄上。
// 第 200 轮把同一把尺子量到另外几处，**三千项就够**（只要回调里造垃圾）：
// `map` / `filter` 的结果数组、`reduce` 的累加器、`new C(...xs)` 那个新造的实例。
//
// 修法不是逐处打补丁，而是给这一层一格**临时根**（引擎的 `Temps` / `RootKeeper()`）——
// 纪律是：**凡跨过一次会分配的动作，就挂上**。
//
// 下面每一段都**故意在回调里造 2KB 垃圾**：那是把窗口逼出来的手段（不是为了跑得慢）。
// 例子里每一段都算一个**普通的**小任务（筛一遍、求和、构造一批对象），
// 只是规模刚好越过回收阈值——所以它们同时是「普通 `.ts`」的用例。

const n = 3000;
const xs: number[] = [];
for (let i = 0; i < n; i++) xs.push(i);

// ① `map`：结果数组要在三千次回调（每次 2KB 垃圾）之间活下来
const doubled = xs.map((v: number) => {
  const pad = "x".repeat(2000);
  return v * 2 + pad.length - 2000;
});
console.log(doubled.length, doubled[0], doubled[n - 1]);

// ② `filter`：结果数组 + 判据回调
const odd = xs.filter((v: number) => {
  const pad = "x".repeat(2000);
  return v % 2 === 1 && pad.length === 2000;
});
console.log(odd.length, odd[0], odd[odd.length - 1]);

// ③ `reduce`：累加器**不在数组身上**（第一轮是初值、之后是上一轮回调的返回值）——
// **要用对象当累加器**：用数的话它根本不是引用型，这一格就**空转**了。
const total = xs.reduce((acc: { sum: number }, v: number) => {
  const pad = "x".repeat(2000);
  acc.sum = acc.sum + v + pad.length - 2000;
  return acc;
}, { sum: 0 });
console.log(total.sum);

// ④ `new C(...xs)`：新造的实例要在构造函数的死循环之间活下来（它拿它当 `this`）
class Accumulator {
  value = 0;
  constructor(seed: number) {
    for (let i = 0; i < 4000; i++) {
      const pad = "y".repeat(2000);
      this.value = seed + pad.length - 2000;
    }
  }
}
const seedArg: number[] = [7];
console.log(new Accumulator(...seedArg).value);

// ⑤ 小规模那一档照旧（回归：加了根不等于改了语义）
console.log([1, 2, 3].map((v: number) => v + 1).join(","));
console.log([1, 2, 3, 4].filter((v: number) => v % 2 === 0).join(","));
console.log([1, 2, 3, 4].reduce((m: number, v: number) => m + v, 0));
