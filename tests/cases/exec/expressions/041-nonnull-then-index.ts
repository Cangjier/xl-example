// xl:title 非空断言后面直接跟下标：那一格是下标，不是数组字面量
// xl:round 303
// xl:judge stdout
// xl:end

const o: any = { b: [1, 2, 3] };
console.log(o.b![1], o.b![0]);
const s: any = "abc";
console.log(s![0], s![2]);
const a: any = [7, 8];
console.log(a[0]!, o.b[0]! + 1);
const deep: any = { a: { b: [3, 4] } };
console.log(deep!.a!.b![1]);

// **这一条钉三格** ✓：断言后面直接跟下标 ✓、下标后面再跟断言（a[0]! ✓）、
// 以及断言连着断言再接下标（deep!.a!.b![1] ✓）。
// **没做的一格** ✗（写在 typescript-exec/README.md 第 303 轮那一节 ✓）：
//   · 下标后面**再跟一个下标**（x![1]![0] ✓）——第二个方括号会掉；
//   · 下标后面**再进一个二元运算**（o.b![2] + 0 ✓）——那个方括号会被折进 BinaryOperator 里。
