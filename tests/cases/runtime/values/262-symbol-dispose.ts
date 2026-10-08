// xl:title Symbol.dispose / Symbol.asyncDispose 与符号键方法
// xl:round 676
// xl:judge stdout
// xl:end

console.log(typeof Symbol.dispose, typeof Symbol.asyncDispose);
console.log(Symbol.dispose === Symbol.dispose, Symbol.dispose.description);
const holder: any = { [Symbol.dispose]() { console.log("disposed"); } };
holder[Symbol.dispose]();
