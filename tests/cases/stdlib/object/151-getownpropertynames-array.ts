// xl:title 数组的 `getOwnPropertyNames` 含 `length`
// xl:round 691
// xl:judge stdout
// xl:want differ
// xl:why 函数自己的 `arguments` / `caller` 两格没装（`getOwnPropertyNames(f)` 少两个名字）。要做。
// xl:end
const a: any = [1, 2];
console.log(Object.getOwnPropertyNames(a).join(","));
console.log(Object.getOwnPropertyNames("ab").join(","));
function f(): void {}
console.log(Object.getOwnPropertyNames(f).join(","));
