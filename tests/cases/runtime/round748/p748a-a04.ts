// xl:title `in`：原型链上的名字算、数组下标算
// xl:round 748
// xl:judge stdout
// xl:end
const base = { a: 1 };
const o: any = Object.create(base);
o.b = 2;
console.log("a" in o, "b" in o, "c" in o, "toString" in o, "hasOwnProperty" in o);
console.log(Object.hasOwn(o, "a"), Object.hasOwn(o, "b"));
const arr = [7, , 9];
console.log(0 in arr, 1 in arr, 2 in arr, "length" in arr, 3 in arr);
console.log("a" in { a: undefined }, "0" in ["x"]);
