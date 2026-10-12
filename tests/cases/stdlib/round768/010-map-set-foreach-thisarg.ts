// xl:title `Map` / `Set` 的 `forEach`：三格实参与**第二格 `thisArg`**
// xl:round 768
// xl:judge stdout
// xl:note 第 768 轮收掉的一格：`forEach(回调, thisArg)` 的第二格原来**没人接**——
// xl:note 两条支都把接收者写死成 `undefined` ⇒ `m.forEach(function () { this.tag }, holder)`
// xl:note 里 `this.tag` 是 `undefined`（**静默错值**：再参与运算就是 `NaN`）。
// xl:note 现在接收者取「有第二格就用它」——与数组那一族同一条口径
// xl:note （**都不装箱**：原始值那一档与 `stdlib/round758/p758a-02-map-thisarg-not-boxed` 同族）。
// xl:note 表里同时钉住三格实参的形状（`(值, 键, 集合自身)`，第三格**就是接收者**同一个对象）、
// xl:note 箭头函数不吃 `this`、以及 `forEach` 返回 `undefined`。
// xl:end
const holder: any = { tag: "T" };
const m = new Map([["a", 1], ["b", 2]]);
const seen: string[] = [];
m.forEach((v, k, map) => seen.push(k + ":" + v + ":" + (map === m)));
console.log("01", seen.join(","));
const s = new Set([1, 2]);
const sv: string[] = [];
s.forEach((v, k, set) => sv.push(v + "=" + k + ":" + (set === s)));
console.log("02", sv.join(","));
const held: string[] = [];
m.forEach(function (this: any, v: number) { held.push(this === holder ? "held" + v : "loose"); }, holder);
s.forEach(function (this: any, v: number) { held.push(this === holder ? "held" + v : "loose"); }, holder);
console.log("03", held.join(","));
m.forEach((v) => held.push("arrow" + v), holder);
console.log("04", held.slice(-3).join(","));
console.log("05", m.forEach(() => 1), typeof m.forEach((v) => v));
