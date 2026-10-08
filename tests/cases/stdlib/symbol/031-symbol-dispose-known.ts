// xl:title Symbol.dispose / Symbol.asyncDispose：同一性、描述与字符串化
// xl:round 650
// xl:judge stdout
// xl:end

console.log(typeof Symbol.dispose, typeof Symbol.asyncDispose);
console.log(Symbol.dispose === Symbol.dispose, Symbol.asyncDispose === Symbol.asyncDispose);
console.log(String(Symbol.dispose), Symbol.dispose.toString(), String(Symbol.asyncDispose));
