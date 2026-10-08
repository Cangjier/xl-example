// xl:title Array.isArray：数组 / 类数组 / 字符串 与 Array 构造器的形态
// xl:judge stdout
// xl:end

console.log(Array.isArray([]), Array.isArray({ length: 0 }), Array.isArray("a"));
console.log(Array.isArray(new Array(3)), Array.isArray(Array.prototype), Array.isArray(null));
