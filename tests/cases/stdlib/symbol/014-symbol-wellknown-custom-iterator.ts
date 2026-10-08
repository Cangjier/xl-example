// xl:title 自定义 Symbol.iterator：可迭代对象与 Object.keys 的对照
// xl:round 291
// xl:judge stdout
// xl:end

const o: any = { [Symbol.iterator]: function* () { yield 1; yield 2; }, normal: 1 };
console.log([...o].join(","), Object.keys(o).join(","));
console.log(typeof Symbol.toPrimitive, typeof Symbol.toStringTag, typeof Symbol.asyncIterator);
