// 第 146 轮：**解构赋值**（`[a, b] = [b, a]`）。
//
// 声明那一半（`const [a, b] = xs`）从第 119 轮起就在跑，赋值这一半一直报
// `unimplemented: assignment to a non-identifier` —— 因为左边的 `[a, b]`
// 在投影里是一个 `ArrayLiteralExpression`（TS 的 AST 就是这么定的），
// 而降级层的 `=` 只认「名字 / 属性 / 下标」三种左值。
//
// 这一轮补上的是它的**另一半**：读法（属性名 / 下标 / 剩余 / 默认值）与声明那一半
// **一个字都不差**，差别只在「写进去」那一步（那边是新声明一个名字，这边是写一个
// 已经存在的槽 / 属性 / 下标，或者再嵌一层模式）。
//
// 这一份量的是端到端：`tsrun` 的 stdout 与 `node` 逐字节相同。

// ① 交换（这一条就是缺口的名字）
let a = 1, b = 2;
[a, b] = [b, a];
console.log("swap", a, b);

// ② 对象：剩余、重命名、默认值
const src = { p: 1, q: 2, r: 3 };
let p = 0, rest: any = null;
({ p, ...rest } = src);
console.log("obj-rest", p, Object.keys(rest).join(","), rest.q, rest.r);

let rn = 0, dv = 0;
({ p: rn, missing: dv = 9 } = src);
console.log("obj-rename-default", rn, dv);

// ③ 数组：洞、剩余、默认值（默认值只在严格 undefined 时生效）
let h1 = 0, h2 = 0;
[, h1, , h2] = [1, 2, 3, 4];
console.log("holes", h1, h2);

let first = 0, tail: number[] = [];
[first, ...tail] = [10, 20, 30];
console.log("array-rest", first, tail.join("-"));

let d1 = 3, d2 = 0;
[d1 = 99, d2 = d1 + 10] = [undefined, undefined];
console.log("array-default", d1, d2);

// ④ 嵌套模式 + 成员目标 + 计算键
let n1 = 0, n2 = 0, n3 = 0;
[n1, [n2, n3]] = [1, [2, 3]];
console.log("nested", n1, n2, n3);

const holder = { x: 0, y: { z: 0 } };
const arr = [0, 0];
[holder.x, arr[0], holder.y.z] = [7, 8, 9];
console.log("member-targets", holder.x, arr[0], holder.y.z);

const key = "k";
let computed = "";
({ [key]: computed } = { k: "hit" });
console.log("computed", computed);

// ⑤ 赋值表达式的值是右边；求值顺序是「右边先算完、目标从左到右」
let w = 0;
const whole = ([w] = [42]);
console.log("value-of-assignment", w, whole[0]);

const order: string[] = [];
function rhs(): number[] { order.push("rhs"); return [1, 2]; }
function target(): any { order.push("target"); return holder; }
[target().x, holder.x] = rhs();
console.log("order", order.join(","), holder.x);

// ⑥ 字符串也能被拆（字符串是可迭代物 / 可下标，第 136 轮）
let c1 = "", c2 = "";
[c1, c2] = "ab";
console.log("string-rhs", c1, c2);
