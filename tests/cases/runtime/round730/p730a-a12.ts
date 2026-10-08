// xl:title `Symbol.toStringTag` 挂在哪一格（原型上、不是自己身上）
// xl:round 730
// xl:judge stdout
// xl:end
async function af() {}
console.log(Object.getOwnPropertySymbols(af).length);
console.log(Object.getOwnPropertySymbols(Object.getPrototypeOf(af)).length);
console.log(Object.prototype.toString.call(af));
