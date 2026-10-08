// xl:title `console.dir` 的 options：depth 一路带下去（含 `depth: null`）
// xl:round 765
// xl:judge stdout
// xl:note 第 765 轮收掉的两格（`console.dir` 的 options）：
// xl:note ① **第二格是 options、不是第二个要印的实参**——原来九支共用一份实现 ⇒
// xl:note    `console.dir({a:1}, {depth:0})` 印成 `{ a: 1 } { depth: 0 }`（Node 印 `{ a: 1 }`）；
// xl:note ② **`depth` 要一路带进去**——`InspectValue` 收了上限，可两道递归
// xl:note    （`InspectArrayBody` / `InspectObjectBody`）**没往下传**，于是每一层都回落到默认的
// xl:note    `2`：`{depth:0}` 照样把整棵树印出来（**这一轮实测当场红的**，见那两格的说明）。
// xl:note 表里还钉住 `depth: null`（不设上限）、`Map` / `Set` 两支、以及 `Date` **不收**那一格。
// xl:end
console.dir({ a: { b: { c: 1 } } }, { depth: 0 });
console.dir({ a: { b: { c: 1 } } }, { depth: 1 });
console.dir({ a: { b: { c: 1 } } }, { depth: 2 });
console.dir({ a: { b: { c: 1 } } }, { depth: null });
console.dir([1, [2, [3, [4]]]], { depth: 1 });
console.dir(new Map([["k", { m: 1 }]]), { depth: 0 });
console.dir(new Set([{ s: 1 }]), { depth: 0 });
console.dir(new Date(0), { depth: 0 });
console.dir({ a: 1 });
console.log("done");
