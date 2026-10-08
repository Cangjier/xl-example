// xl:title `void` 在实参 / `return` / 三元 / 逻辑位置
// xl:round 727
// xl:judge stdout
// xl:end
function g(): any { return void [1]; }
console.log(g());
console.log(true ? void { a: 1 } : 2);
console.log((void { a: 1 }) === undefined, (void [1]) === undefined);
console.log([1].map(() => void { k: 1 }).length);
