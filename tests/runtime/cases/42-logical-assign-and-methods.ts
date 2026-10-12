// 第 150 轮：一次「日常写法普查」量出来的三个口子
//
// 普查的做法：32 条普通写法各一小段，分别交给 node 与 tsrun，
// 只留下「**node 跑得动、tsrun 跑不动**」的那些当选题依据。
// 那一轮开始时是 32 条里 **14 条**跑得动（其中 6 条 stdout 还不同），
// 收工时 **22 条**跑得动。这一份量的是收工后新增的那几格。

// ① 逻辑赋值（`||=` / `&&=` / `??=`）：糖，落成控制流
let a = 0;
a ||= 5;
let b = 1;
b &&= 7;
let c: any = null;
c ??= 3;
let d = 2;
d ||= 9;
let e = 0;
e &&= 9;
let f = 5;
f ??= 9;
// **右边只算一次**（短路那一半生效时它一次都不算）
let calls = 0;
function rhs(): number {
  calls++;
  return 4;
}
let g = 0;
g ||= rhs();
let h = 1;
h ||= rhs();
console.log(a, b, c, d, e, f, g, h, calls);

// ② 原始值原型：`Number.prototype` / `Boolean.prototype` 从这一轮起有了
console.log((1.2345).toFixed(2), (1.005).toFixed(2), (1.5).toFixed(), (0).toFixed(3));
console.log((255).toString(16), (255).toString(2), (1.5).toString(), (255).toString());
console.log(true.toString(), false.toString(), typeof (1).toFixed, typeof [].push);

// ③ 三个日常方法：`at` / `splice` / `replaceAll`
console.log([1, 2, 3].at(-1), [1, 2, 3].at(0), [1, 2, 3].at(9), [1, 2, 3].at(-9));
const xs = [1, 2, 3, 4, 5];
console.log(xs.splice(1, 2).join(","), xs.join(","));
const ys = [1, 2, 3];
console.log(ys.splice(1, 0, "a", "b").length, ys.join(","));
const zs = [1, 2, 3, 4];
console.log(zs.splice(-2).join(","), zs.join(","));
const vs = [1, 2, 3];
console.log(vs.splice(0, 1, 9, 9, 9, 9).join(","), vs.join(","));
console.log("a-b-c".replaceAll("-", "+"), "aaa".replaceAll("a", "aa"), "abc".replaceAll("", "-"));
console.log("a-b".replace("-", "+"), "aaa".replace("a", "b"), "abc".replace("", "-"), "zz".replace("q", "!"));
