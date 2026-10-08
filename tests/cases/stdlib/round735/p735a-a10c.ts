// xl:title `Array.from` 的 `length` 是数字**文本**、或是**访问器**
// xl:round 735
// xl:judge stdout
// xl:end
// 两格都收到 `ArrayLikeLength` 那一条 `ToLength(Get(O, "length"))` 上：
//   · `"3"` 这种数字文本原来不认 ⇒ 给 **0** 项（Node 读三项）；
//   · 访问器那一格原来被 `continue` 跳过 ⇒ 落到「不是数组式」⇒ 走迭代器那条路。
const s: any = { length: "3", 0: "a", 1: "b", 2: "c" };
console.log(Array.from(s).join(","));
console.log(Array.from({ length: "2.7", 0: "a", 1: "b", 2: "c" } as any).join(","));
console.log(Array.from({ length: "0.9", 0: "a" } as any).length);
console.log(Array.from({ length: -1 } as any).length);
const withGet: any = { get length() { return 2; }, 0: "x", 1: "y" };
console.log(Array.from(withGet).join(","));
console.log(Array.from({ get length() { return 0; } } as any).length);
console.log(Array.prototype.slice.call(s).join(","));
console.log(Array.prototype.slice.call({ length: "2.7", 0: "a", 1: "b" } as any).join(","));
console.log(Array.prototype.slice.call(withGet).join(","));
