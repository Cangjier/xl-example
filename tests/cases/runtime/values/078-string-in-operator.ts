// xl:title in 在对象 / 数组 / 原型链上的口径
// xl:judge stdout
// xl:end

const o: any = { a: 1 };
console.log("a" in o, "b" in o, "toString" in o);
console.log(0 in [1, 2], 2 in [1, 2], "length" in []);
