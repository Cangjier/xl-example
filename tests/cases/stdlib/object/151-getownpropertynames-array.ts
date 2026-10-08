// xl:title 数组的 `getOwnPropertyNames` 含 `length`
// xl:round 691
// xl:judge stdout
// xl:end
const a: any = [1, 2];
console.log(Object.getOwnPropertyNames(a).join(","));
console.log(Object.getOwnPropertyNames("ab").join(","));
function f(): void {}
console.log(Object.getOwnPropertyNames(f).join(","));
