// xl:title stringify：undefined / 函数 / 符号在对象与数组里的两种命运
// xl:round 371
// xl:judge stdout
// xl:end
console.log(JSON.stringify({ a: undefined, b: () => 0, c: Symbol("s"), d: 1 }));
console.log(JSON.stringify([undefined, () => 0, Symbol("s"), 1]));
console.log(JSON.stringify(undefined), JSON.stringify(() => 0), JSON.stringify(Symbol("s")));
console.log(JSON.stringify({ a: undefined }), JSON.stringify([undefined]));
