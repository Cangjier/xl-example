// xl:title 符号键不进 `Object.keys`（与 `getOwnPropertySymbols` 的分工）
// xl:round 647
// xl:judge stdout
// xl:end
// 判定点只有一个：**符号键不属于「字符串键」那一族**——`Object.keys` / `JSON` 看不到它，
// 要拿它只能走 `getOwnPropertySymbols`（且拿到的是**同一个**符号值）。
//
// 合并了原先同一个判定点的另一条：`033-object-getownpropertydescriptors-symbols`
//（它问的是同一件事的另外三个侧面）。`Object.getOwnPropertyNames` 那一侧
// 由 `105-object-getownpropertynames-array` 的数组档与 `092` 的可枚举分界负责。
const s = Symbol("k");
const o: any = { a: 1, [s]: 2 };
console.log(Object.getOwnPropertySymbols(o).length, Object.getOwnPropertySymbols(o)[0] === s);
console.log(Object.keys(o).join(","), JSON.stringify(o));
console.log(Object.getOwnPropertySymbols({}).length);
// 033 带过来的三个侧面：名表里没有符号、符号也不进 keys
console.log(Object.getOwnPropertyNames(o).join(","));
console.log(Object.keys(o).length);
