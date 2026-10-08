// xl:title 那两格的标志位：`name` / `length` 不进枚举、也不进 `for..in`
// xl:round 733
// xl:judge stdout
// xl:end
console.log(Object.keys(Function.prototype).length, Object.keys(Object.prototype).length);
console.log(Object.getOwnPropertyNames(Function.prototype).indexOf("call") >= 0);
console.log(Object.keys(Math).length);
console.log(Object.getOwnPropertyDescriptor(Function.prototype, "call") !== undefined);
