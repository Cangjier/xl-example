// xl:title 类数组接收者的小数 `length` 走同一条 `ToLength`
// xl:round 735
// xl:judge stdout
// xl:end
// 同一格根在**类数组接收者**那一侧也各写了一份（`ArrayLikeLength`）——
// `slice.call({ length: 2.5 })` 原来给 `[]`、Node 给两项。
const o: any = { length: 2.5, 0: "a", 1: "b", 2: "c" };
console.log(Array.prototype.slice.call(o).join(","));
console.log(Array.prototype.join.call(o, "-"));
console.log(Array.prototype.indexOf.call(o, "b"));
console.log(Array.prototype.map.call(o, (v) => v + "!").join(","));
console.log(Array.prototype.slice.call({ length: 0.9, 0: "a" } as any).length);
console.log(Array.prototype.slice.call({ length: -2 } as any).length);
